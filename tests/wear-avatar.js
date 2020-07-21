const test  = require('ava');
const fetch = require('node-fetch');

const REQUEST_URL = 'https://users.exokit.org/';
const TEST_PACKAGE_HASH = 'QmSKqHaXQv9WxzVYWSKKuvG13G7DFbpFhfDaeEPtYoSVcq';

test('wear model as avatar', async t => {
    try {

        const dummyUser = {
            "name":'nonides-estrara',
            "avatarHash":'',
            "inventory":[]
        }
    
        const clearUserReq = await fetch(`${REQUEST_URL}${dummyUser.name}`, {
            method: 'PUT',
            body: JSON.stringify(dummyUser),
        });
        const clearedRes = await clearUserReq.json();
        if(!clearedRes.ok) {
            t.fail('failed to clear user object');
        }

        dummyUser.avatarHash = TEST_PACKAGE_HASH;
        const wearAvatarReq = await fetch(`${REQUEST_URL}${dummyUser.name}`, {
            method: 'PUT',
            body: JSON.stringify(dummyUser)
        });
        const userRes = await wearAvatarReq.json();

        if(userRes.ok) {
            t.pass();
        }
        else {
            t.fail('avatarHash does not match test hash');
        }

    } catch (err) {
        t.fail(err);
    }
});

