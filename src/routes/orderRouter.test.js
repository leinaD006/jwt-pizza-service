const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';

    await DB.addUser(user);

    user.password = 'toomanysecrets';
    return user;
}

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

function randomPrice() {
    return (Math.random() * 100).toFixed(2);
}

async function createMenuItem() {
    let title = randomName();
    let menuItem = {
        title: title,
        description: randomName(),
        image: title + '.png',
        price: randomPrice(),
    };

    const menuItemRes = await request(app)
        .put('/api/order/menu')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send(menuItem);

    let fullMenu = menuItemRes.body;

    return fullMenu;
}

let adminUser;
let fullMenu;

beforeEach(async () => {
    adminUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(adminUser);

    adminUser.id = loginRes.body.user.id;
    adminUser.token = loginRes.body.token;

    fullMenu = await createMenuItem();
});

test('get menu', async () => {
    const menuRes = await request(app).get('/api/order/menu').send();
    expect(menuRes.status).toBe(200);

    const menu = menuRes.body;

    expect(menu).toEqual(fullMenu);
});
