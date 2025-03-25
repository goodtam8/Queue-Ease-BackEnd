// ai.js
const tf = require('@tensorflow/tfjs-node');

let isTraining = false;
let currentModel = null;
let currentNormParams = null;
const fs = require('fs'); // Missing import added
const path = require('path'); 
// Define constants properly
const MODEL_DIR = path.resolve('./my-model');
// Change from directory path to explicit model.json path
const MODEL_PATH = `file://${MODEL_DIR}/model.json`;  // Added /model.json

// Update model saving path
const MODEL_SAVE_DIR = `file://${MODEL_DIR}`;  // For saving only
const NORM_PARAMS_PATH = path.resolve('./norm-params.json');
const CSV_PATH = path.resolve('./waitingtime.csv');

// Normalize data for training
async function normalizeData(points) {
    const xs = points.map(p => p.xs);
    const ys = points.map(p => p.ys);

    const xsTensor = tf.tensor2d(xs);
    const ysTensor = tf.tensor2d(ys);

    // Normalize features
    const xsMax = xsTensor.max(0);
    const xsMin = xsTensor.min(0);
    const xsNormalized = xsTensor.sub(xsMin).div(xsMax.sub(xsMin));

    return { xs: xsNormalized, ys: ysTensor, xsMin, xsMax };
}
function createModel() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [5] }));
    model.add(tf.layers.dense({ units: 1 })); // Output layer for regression
    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    return model;
}
// Load the trained model
async function loadModel() {
    try {
        // Load from explicit model.json path
        const model = await tf.loadLayersModel(MODEL_PATH);
        const normParams = JSON.parse(fs.readFileSync(NORM_PARAMS_PATH, 'utf8'));
        return { model, normParams };
    } catch (error) {
        console.error("Error loading model:", error);
        throw error;
    }
}

async function initializeModel() {
    try {
        // Check if model exists
        if (fs.existsSync('./my-model/model.json') && fs.existsSync(NORM_PARAMS_PATH)) {
            console.log('Loading existing model...');
            const loaded = await loadModel();
            currentModel = loaded.model;
            currentNormParams = loaded.normParams;
        } else {
            console.log('No existing model found, training new model...');
            await trainAndSaveModel();
            const loaded = await loadModel();
            currentModel = loaded.model;
            currentNormParams = loaded.normParams;
        }
        
        // Setup periodic retraining (every 24 hours)
        setInterval(async () => {
            if (!isTraining) {
                console.log('Starting scheduled model refresh...');
                await refreshModel();
            }
        }, 86400000); // 24 hours in milliseconds
        
    } catch (error) {
        console.error('Model initialization failed:', error);
        process.exit(1); // Exit if model initialization fails
    }
}

async function refreshModel() {
    try {
        isTraining = true;
        console.log('Starting model refresh...');
        
        // Train and save new model
        await trainAndSaveModel();
        
        // Load new model
        const loaded = await loadModel();
        currentModel = loaded.model;
        currentNormParams = loaded.normParams;
        
        console.log('Model refresh completed successfully');
    } catch (error) {
        console.error('Model refresh failed:', error);
    } finally {
        isTraining = false;
    }
}
// Load training data from CSV
async function loadData() {
    try {
        const csvUrl = `file://${CSV_PATH}`;
        const data = tf.data.csv(csvUrl, {
            columnConfigs: {
                waiting_time: {
                    isLabel: true
                }
            }
        });

        const points = data.map(({ xs, ys }) => {
            return { xs: Object.values(xs), ys: Object.values(ys) };
        });

        const pointsArray = await points.toArray();
        console.log("Data loaded successfully:", pointsArray);
        return pointsArray;
    } catch (error) {
        console.error("Error loading CSV data:", error);
        return [];
    }
}
// Train and save model
async function trainAndSaveModel() {
    const points = await loadData();
    if (points.length > 0) {
        // Get the normalized data and normalization parameters
        const { xs, ys, xsMin, xsMax } = await normalizeData(points);
        
        // Save normalization parameters
        const normParams = {
            xsMin: await xsMin.arraySync(),
            xsMax: await xsMax.arraySync()
        };
        fs.writeFileSync(NORM_PARAMS_PATH, JSON.stringify(normParams));
        
        const model = createModel();
        await trainModel(model, xs, ys);

        // Save the model
        await model.save(MODEL_SAVE_DIR);  // Use directory path for saving
        
        console.log("Model and normalization parameters saved successfully");
        return true;
    }
    return false;
}
// Modified predict function to use in-memory model
// Predict waiting time with the model
async function predictWaitingTime(features) {
    try {
        // Validate input
        if (features.length !== 5) {
            throw new Error('Input must have exactly 5 features');
        }
        
        // Load model and normalization parameters
        const { model, normParams } = await loadModel();
        
        // Convert parameters to tensors
        const xsMin = tf.tensor1d(normParams.xsMin);
        const xsMax = tf.tensor1d(normParams.xsMax);
        
        // Convert input to tensor and normalize
        const inputTensor = tf.tensor2d([features]);
        const normalizedInput = inputTensor.sub(xsMin).div(xsMax.sub(xsMin));
        
        // Make prediction
        const prediction = model.predict(normalizedInput);
        const predictedWaitingTime = await prediction.data();
        
        // Clean up tensors
        tf.dispose([xsMin, xsMax, inputTensor, normalizedInput, prediction]);
        
        return predictedWaitingTime[0];
    } catch (error) {
        console.error("Prediction error:", error);
        throw error;
    }
}
// Train the model
async function trainModel(model, xs, ys) {
    const history = await model.fit(xs, ys, {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                console.log(`Epoch ${epoch}: loss = ${logs.loss}`);
            }
        }
    });
    return history;
}

module.exports = {
    initializeModel,
    predictWaitingTime
};
