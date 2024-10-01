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
        .set('Authorization', `Bearer ${adminToken}`)
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
        .set('Authorization', `Bearer ${adminToken}`)
        .send(store);

    store.id = storeRes.body.id;

    return store;
}

let adminUser;
let adminToken;

let testFranchise;
let testStore;

beforeAll(async () => {
    adminUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    adminToken = loginRes.body.token;

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
