const request = require('supertest');
const app = require('../service');

test('get menu', async () => {
    const menuRes = await request(app).get('/api/order/menu').send();
    expect(menuRes.status).toBe(200);

    const menu = menuRes.body;

    expect(menu).toContainEqual({
        id: 1,
        title: 'Veggie',
        image: 'pizza1.png',
        price: 0.0038,
        description: 'A garden of delight',
    });
});
