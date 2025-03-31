// fyp/routes/table.test.js
const request = require('supertest');
const express = require('express');
const router = require('../routes/table');
const { connectToDB, ObjectId } = require('../utils/db');

jest.mock('../utils/db');

const app = express();
app.use(express.json());
app.use('/table', router);

describe('Table Routes', () => {
    let mockDb;

    beforeEach(() => {
        mockDb = {
            collection: jest.fn().mockReturnThis(),
            find: jest.fn(),
            findOne: jest.fn(),
            updateOne: jest.fn(),
            countDocuments: jest.fn(),
            aggregate: jest.fn(),
            toArray: jest.fn(),
            client: { close: jest.fn() },
        };
        connectToDB.mockResolvedValue(mockDb);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /:name', () => {
        it('should return tables for a valid restaurant name', async () => {
            mockDb.toArray.mockResolvedValue([{ id: 1, name: 'Table 1' }]);

            const res = await request(app).get('/table/restaurant1');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ table: [{ id: 1, name: 'Table 1' }] });
            expect(mockDb.collection).toHaveBeenCalledWith('table');
        });

        it('should return 404 if no tables are found', async () => {
            mockDb.toArray.mockResolvedValue([]);

            const res = await request(app).get('/table/restaurant1');

            expect(res.status).toBe(404);
            expect(res.body).toEqual({ message: 'Table not found' });
        });

        it('should return 400 on database error', async () => {
            mockDb.toArray.mockRejectedValue(new Error('Database error'));

            const res = await request(app).get('/table/restaurant1');

            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Database error' });
        });
    });

    describe('GET /:name/status', () => {
        it('should return true if all tables are busy', async () => {
            mockDb.toArray.mockResolvedValue([{ id: 1 }]);
            mockDb.countDocuments.mockResolvedValue(0);

            const res = await request(app).get('/table/restaurant1/status');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ status: true });
        });

        it('should return false if some tables are available', async () => {
            mockDb.toArray.mockResolvedValue([{ id: 1 }]);
            mockDb.countDocuments.mockResolvedValue(1);

            const res = await request(app).get('/table/restaurant1/status');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ status: false });
        });

        it('should return 404 if no tables are found', async () => {
            mockDb.toArray.mockResolvedValue([]);

            const res = await request(app).get('/table/restaurant1/status');

            expect(res.status).toBe(404);
            expect(res.body).toEqual({ message: 'Table not found' });
        });
    });

    describe('GET /stats/restaurant', () => {
        it('should return aggregated stats', async () => {
            mockDb.aggregate.mockReturnValue({
                toArray: jest.fn().mockResolvedValue([{ _id: { belong: 'restaurant1', status: 'available' }, total: 5 }]),
            });

            const res = await request(app).get('/table/stats/restaurant');

            expect(res.status).toBe(200);
            expect(res.body).toEqual([{ _id: { belong: 'restaurant1', status: 'available' }, total: 5 }]);
        });

        it('should return 400 on database error', async () => {
            mockDb.aggregate.mockReturnValue({
                toArray: jest.fn().mockRejectedValue(new Error('Database error')),
            });

            const res = await request(app).get('/table/stats/restaurant');

            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Database error' });
        });
    });

    describe('PUT /:id/occupied', () => {
        it('should update table status to occupied', async () => {
            mockDb.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const res = await request(app).put('/table/123/occupied').send({ status: 'occupied' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ message: 'Table updated' });
        });

        it('should return 404 if table is not found', async () => {
            mockDb.updateOne.mockResolvedValue({ modifiedCount: 0 });

            const res = await request(app).put('/table/123/occupied').send({ status: 'occupied' });

            expect(res.status).toBe(404);
            expect(res.body).toEqual({ message: 'Table not found' });
        });

        it('should return 400 on database error', async () => {
            mockDb.updateOne.mockRejectedValue(new Error('Database error'));

            const res = await request(app).put('/table/123/occupied').send({ status: 'occupied' });

            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Database error' });
        });
    });

    describe('PUT /:id/free', () => {
        it('should update table status to free and calculate average dining time', async () => {
            mockDb.findOne.mockResolvedValueOnce({ status: 'in used', occupiedSince: new Date(), belong: 'restaurant1' });
            mockDb.findOne.mockResolvedValueOnce({ '1-2 people': 30 });
            mockDb.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const res = await request(app).put('/table/123/free').send({ status: 'free' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ message: 'Table updated to available' });
        });

        it('should return 404 if table is not in use', async () => {
            mockDb.findOne.mockResolvedValue(null);

            const res = await request(app).put('/table/123/free').send({ status: 'free' });

            expect(res.status).toBe(404);
            expect(res.text).toBe('Table not found or not in used');
        });

        it('should return 500 on error', async () => {
            mockDb.findOne.mockRejectedValue(new Error('Database error'));

            const res = await request(app).put('/table/123/free').send({ status: 'free' });

            expect(res.status).toBe(500);
            expect(res.text).toBe('Error updating table status and historical data');
        });
    });
});