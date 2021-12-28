const Yml = require('yaml');
const Database = require('./_database');
const MakeConfig = require('../scripts/makeConfig');
const { Logger } = require('fallout-utility');

const log = new Logger('RoleManagement');
let scriptConfig = null;
let db = null;

class Role {
    constructor() {
        this.versions = ['1.4.1', '1.4.2', '1.4.3', '1.4.4'];
    }

    async start(Client) {
        scriptConfig = this.getConfig('./config/roles.yml');
        db = await new Database(scriptConfig.databaseServerId, scriptConfig.databaseChannelId, scriptConfig.databaseName).start(Client);

        await db.fetchData(scriptConfig.databaseMessageId ? scriptConfig.databaseMessageId : null, true);
        await db.automaticFetch();
        await db.update({
            'testData': 'testData',
            'testFromBlob': [
                'testFromBlob',
                {
                    collaborators: [
                        'BlobHuman',
                        'GhexterCortes'
                    ]
                }
            ]
        })
        log.log(db.response);
        return true;
    }

    loaded(Client) {
    }

    getConfig(location) {
        return Yml.parse(MakeConfig(location, {
            databaseName: 'roles',
            databaseServerId: '830456204735807529',
            databaseChannelId: '907897856478806016',
            databaseMessageId: '925314063616057344'
        }))
    }
}

module.exports = new Role();