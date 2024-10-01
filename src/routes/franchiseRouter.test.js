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

async function createFranchise() {
    let testFranchise = {
        name: randomName() + 'Pizza',
        admins: [{ email: adminUser.email }],
    };

    const franchiseRes = await request(app)
        .post('/api/franchise')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send(testFranchise);

    testFranchise.id = franchiseRes.body.id;

    return testFranchise;
}

async function createStore() {
    let store = {
        name: randomName(),
        franchiseId: testFranchise.id,
    };

    const storeRes = await request(app)
        .post(`/api/franchise/${testFranchise.id}/store`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send(store);

    store.id = storeRes.body.id;

    return store;
}

let adminUser;
let testFranchise;
let testStore;

beforeAll(async () => {
    adminUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(adminUser);

    adminUser.id = loginRes.body.user.id;
    adminUser.token = loginRes.body.token;

    testFranchise = await createFranchise();

    testStore = await createStore();

    testFranchise.stores = [testStore];
});

test('get franchises', async () => {
    const franchiseRes = await request(app).get('/api/franchise').send();
    expect(franchiseRes.status).toBe(200);

    const franchises = franchiseRes.body;

    let expectedFranchise = {
        id: testFranchise.id,
        name: testFranchise.name,
        stores: [
            {
                id: testStore.id,
                name: testStore.name,
            },
        ],
    };

    expect(franchises).toContainEqual(expectedFranchise);
});

test('get user franchises', async () => {
    const franchiseRes = await request(app)
        .get(`/api/franchise/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send();

    expect(franchiseRes.status).toBe(200);

    let expectedFranchise = {
        id: testFranchise.id,
        name: testFranchise.name,
        admins: [
            {
                email: adminUser.email,
                id: adminUser.id,
                name: adminUser.name,
            },
        ],
        stores: [
            {
                id: testStore.id,
                name: testStore.name,
                totalRevenue: 0,
            },
        ],
    };

    const franchises = franchiseRes.body;
    expect(franchises).toContainEqual(expectedFranchise);
});
