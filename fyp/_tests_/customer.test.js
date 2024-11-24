const request = require('supertest');
const express = require('express');
const customerRouter = require('../routes/customer'); // Adjust the path accordingly
const { connectToDB } = require('../utils/db');

jest.mock('../utils/db'); // Mock the database connection

const app = express();
app.use(express.json()); // For parsing application/json
app.use('/customers', customerRouter); // Mount the router

describe('Customer Routes', () => {
    let db;

    beforeEach(() => {
        db = {
            collection: jest.fn().mockReturnValue({
                insertOne: jest.fn(),
                updateOne: jest.fn(),
                findOne: jest.fn(),
                find: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue({
                        skip: jest.fn().mockReturnValue({
                            limit: jest.fn().mockReturnValue({
                                toArray: jest.fn(),
                            }),
                        }),
                    }),
                }),
                countDocuments: jest.fn(),
                createIndex: jest.fn(),
            }),
            client: {
                close: jest.fn(),
            },
        };

        connectToDB.mockResolvedValue(db); // Mock the DB connection
    });

    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks after each test
    });

    test('POST /customers - should create a new customer', async () => {
        const newCustomer = { name: 'John Doe', email: 'john@example.com' };
        db.collection().insertOne.mockResolvedValue({ insertedId: '12345' });

        const response = await request(app)
            .post('/customers')
            .send(newCustomer);

        expect(response.status).toBe(201);
        expect(response.body).toEqual({ id: '12345' });
        expect(db.collection).toHaveBeenCalledWith('customer');
        expect(db.collection().insertOne).toHaveBeenCalledWith(newCustomer);
    });

    test('PUT /customers/:id - should update an existing customer', async () => {
        const updatedCustomer = { name: 'Jane Doe' };
        db.collection().updateOne.mockResolvedValue({ modifiedCount: 1 });

        const response = await request(app)
            .put('/customers/12345')
            .send(updatedCustomer);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'Customer updated' });
        expect(db.collection().updateOne).toHaveBeenCalledWith(
            { _id: expect.any(Object) }, 
            { $set: updatedCustomer }
        );
    });

    test('GET /customers/:id - should retrieve a customer', async () => {
        const customer = { _id: '12345', name: 'John Doe', email: 'john@example.com' };
        db.collection().findOne.mockResolvedValue(customer);

        const response = await request(app)
            .get('/customers/12345');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(customer);
    });

    test('GET /customers/:id - should return 404 if customer not found', async () => {
        db.collection().findOne.mockResolvedValue(null);

        const response = await request(app)
            .get('/customers/12345');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Customer not found' });
    });

    test('GET /customers - should retrieve a list of customers', async () => {
        const customers = [{ _id: '12345', name: 'John Doe' }];
        db.collection().find().sort().skip().limit().toArray.mockResolvedValue(customers);
        db.collection().countDocuments.mockResolvedValue(1);

        const response = await request(app)
            .get('/customers?page=1&perPage=6');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ customers, total: 1, page: 1, perPage: 6 });
    });
});
