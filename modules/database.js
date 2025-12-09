const path = require("node:path")
const utils = require("./utils")
const Logger = require("./logger")
const crypto = require("node:crypto")
const bcrypt = require("bcryptjs")
const logger = new Logger(path.join(__dirname, ".."))
const Database = require("better-sqlite3")
const database = new Database(path.join(__dirname, "..", "data", "database.db"))
const usernameRegex = /^[a-zA-Z0-9]{3,16}$/

async function setup() {
    database.exec(`
        CREATE TABLE IF NOT EXISTS players (
            email TEXT NULL UNIQUE,
            username VARCHAR(${utils.getMinMaxFromRegex(`${usernameRegex}`).max}) NOT NULL UNIQUE,
            password TEXT NOT NULL,
            uuid VARCHAR(36) NOT NULL UNIQUE PRIMARY KEY,
            nameChangeAllowed BOOL DEFAULT 1,
            createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "players".bold + " table ready"),
    database.exec(`
        CREATE TABLE IF NOT EXISTS playersProperties (
            name VARCHAR(256) NOT NULL,
            value VARCHAR(512) NOT NULL,
            uuid VARCHAR(36) NOT NULL,
            FOREIGN KEY (uuid) REFERENCES players(uuid)
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "playersProperties".bold + " table ready")
    database.exec(`
        CREATE TABLE IF NOT EXISTS clientSessions (
            accessToken TEXT NOT NULL,
            clientToken VARCHAR(36) NOT NULL,
            uuid VARCHAR(36) NOT NULL,
            FOREIGN KEY (uuid) REFERENCES players(uuid)
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "clientSessions".bold + " table ready")
    database.exec(`
        CREATE TABLE IF NOT EXISTS legacyClientSessions (
            sessionId VARCHAR(36) NOT NULL,
            uuid VARCHAR(36) NOT NULL,
            FOREIGN KEY (uuid) REFERENCES players(uuid) ON DELETE CASCADE
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "legacyClientSessions".bold + " table ready")
    database.exec(`
        CREATE TABLE IF NOT EXISTS uuidToNameHistory (
            uuid VARCHAR(36) NOT NULL,
            username VARCHAR(255) NOT NULL,
            changedAt DATETIME NULL,
            FOREIGN KEY (uuid) REFERENCES players(uuid) ON DELETE CASCADE
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "uuidToNameHistory".bold + " table ready")
    database.exec(`
        CREATE INDEX IF NOT EXISTS idx_uuidToNameHistory_uuid ON uuidToNameHistory (uuid)
    `)
    logger.log("[" + "MySQL".yellow + "] " + "uuidToNameHistory".bold + " uuid index ready")
    database.exec(`
        CREATE TRIGGER IF NOT EXISTS log_new_user_name
        AFTER INSERT ON players
        FOR EACH ROW
        BEGIN
            INSERT INTO uuidToNameHistory (uuid, username, changedAt)
            VALUES (NEW.uuid, NEW.username, NULL);
        END;
    `)
    logger.log("[" + "MySQL".yellow + "] " + "log_new_user_name".bold + " trigger ready")
    database.exec(`
        CREATE TRIGGER IF NOT EXISTS log_user_name_change
        AFTER UPDATE ON players
        WHEN OLD.username != NEW.username
        BEGIN
            INSERT INTO uuidToNameHistory (uuid, username, changedAt)
            VALUES (NEW.uuid, NEW.username, CURRENT_TIMESTAMP);
        END;
    `)
    logger.log("[" + "MySQL".yellow + "] " + "log_user_name_change".bold + " trigger ready")
    database.exec(`
        CREATE TABLE IF NOT EXISTS blockedServers (
            hashedIp VARCHAR(40) NOT NULL PRIMARY KEY,
            banner VARCHAR(256) DEFAULT 'CONSOLE',
            reason VARCHAR(512) NULL
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "blockedServers".bold + " table ready")
    database.exec(`
        CREATE TABLE IF NOT EXISTS playersPrivileges (
            uuid VARCHAR(36) PRIMARY KEY,
            onlineChat BOOL DEFAULT 1,
            multiplayerServer BOOL DEFAULT 1,
            multiplayerRealms BOOL DEFAULT 1,
            telemetry BOOL DEFAULT 1,
            FOREIGN KEY (uuid) REFERENCES players(uuid) ON DELETE CASCADE
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "playersPrivileges".bold + " table ready")
    database.exec(`
        CREATE TABLE IF NOT EXISTS playersPreferences (
            uuid VARCHAR(36) PRIMARY KEY,
            profanityFilter BOOL DEFAULT 0,
            FOREIGN KEY (uuid) REFERENCES players(uuid) ON DELETE CASCADE
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "playersPreferences".bold + " table ready")
    database.exec(`
        CREATE TABLE IF NOT EXISTS banReasons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key VARCHAR(512) UNIQUE NOT NULL
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "banReasons".bold + " table ready")
    database.exec(`
        CREATE TABLE IF NOT EXISTS bans (
            banId VARCHAR(512) PRIMARY KEY NOT NULL,
            uuid VARCHAR(36) NOT NULL,
            expires INTEGER DEFAULT NULL,
            reason INTEGER NOT NULL,
            reasonMessage VARCHAR(1024) DEFAULT NULL,
            FOREIGN KEY(reason) REFERENCES banReasons(id),
            FOREIGN KEY (uuid) REFERENCES players(uuid) ON DELETE CASCADE
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "bans".bold + " table ready")
    database.exec(`
        CREATE INDEX IF NOT EXISTS idx_bans_uuid ON bans (uuid)
    `)
    logger.log("[" + "MySQL".yellow + "] " + "bans".bold + " uuid index ready")
    database.exec(`
        CREATE TRIGGER IF NOT EXISTS auto_init_player_settings
        AFTER INSERT ON players
        FOR EACH ROW
        BEGIN
            INSERT INTO playersPrivileges (uuid) VALUES (NEW.uuid);
            INSERT INTO playersPreferences (uuid) VALUES (NEW.uuid);
        END;
    `)
    logger.log("[" + "SQLite".yellow + "] " + "auto_init_player_settings".bold + " trigger ready")
    database.exec(`
        CREATE TABLE IF NOT EXISTS playersBlockslist (
            blockerUuid VARCHAR(36) NOT NULL,
            blockedUuid VARCHAR(36) NOT NULL,
            PRIMARY KEY (blockerUuid, blockedUuid),            
            FOREIGN KEY (blockerUuid) REFERENCES players(uuid) ON DELETE CASCADE,
            FOREIGN KEY (blockedUuid) REFERENCES players(uuid) ON DELETE CASCADE
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "playersBlockslist".bold + " table ready")
    database.exec(`
        CREATE TABLE IF NOT EXISTS usernameRules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rule VARCHAR(255) NOT NULL,
            type INTEGER DEFAULT 0
        )
    `)
    logger.log("[" + "SQLite".yellow + "] " + "usernameBlocklist".bold + " table ready")
    database.exec(`
        CREATE TABLE IF NOT EXISTS textures (
            uuid VARCHAR(36) NOT NULL UNIQUE,
            hash VARCHAR(64) PRIMARY KEY NOT NULL,
            type VARCHAR(10) NOT NULL,
            url VARCHAR(2048) NOT NULL,
            alias VARCHAR(64) NULL,
            createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "textures".bold + " table ready")
    database.exec(`
        CREATE TABLE IF NOT EXISTS playersSkins (
            playerUuid VARCHAR(36) NOT NULL,
            assetHash VARCHAR(64) NOT NULL,
            variant VARCHAR(10) DEFAULT "CLASSIC",
            isSelected BOOL DEFAULT 0,
            createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            
            PRIMARY KEY (playerUuid, assetHash),
            
            FOREIGN KEY (playerUuid) REFERENCES players(uuid) ON DELETE CASCADE,
            FOREIGN KEY (assetHash) REFERENCES textures(hash)
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "playersSkins".bold + " table ready")
    database.exec(`CREATE INDEX IF NOT EXISTS idx_active_skin ON playersSkins (playerUuid, isSelected)`)
    logger.log("[" + "MySQL".yellow + "] " + "playersSkins".bold + " playerUuid and isSelected index ready")
    database.exec(`
        CREATE TABLE IF NOT EXISTS playersCapes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playerUuid VARCHAR(36) NOT NULL,
            assetHash VARCHAR(64) NOT NULL,
            isSelected BOOL DEFAULT 0,
            createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

            FOREIGN KEY (playerUuid) REFERENCES players(uuid) ON DELETE CASCADE,
            FOREIGN KEY (assetHash) REFERENCES textures(hash)
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "playersCapes".bold + " table ready")
    database.exec(`CREATE INDEX IF NOT EXISTS idx_active_skin ON playersCapes (playerUuid, assetHash)`)
    logger.log("[" + "MySQL".yellow + "] " + "playersSkins".bold + " playerUuid and isSelected index ready")
    database.exec(`INSERT OR IGNORE INTO textures (hash, type, url, uuid) VALUES ('df8ed96c557d441a63e7b6a4a911ab84fa453b42fc2ae6b01c3e1b02e138168c', 'SKIN', '/texture/alex.png', '${crypto.randomUUID()}')`)
    database.exec(`INSERT OR IGNORE INTO textures (hash, type, url, uuid) VALUES ('4c7b0468044bfecacc43d00a3a69335a834b73937688292c20d3988cae58248d', 'SKIN', '/texture/steve.png', '${crypto.randomUUID()}')`)
    logger.log("[" + "MySQL".yellow + "] Inserted (or already inserted) defaults skin (steve, alex) in " + "textures".bold)
    database.exec(`
        CREATE TRIGGER IF NOT EXISTS unique_active_skin
        AFTER UPDATE OF isSelected ON playersSkins
        FOR EACH ROW
        WHEN NEW.isSelected = 1
        BEGIN
            UPDATE playersSkins 
            SET isSelected = 0 
            WHERE playerUuid = NEW.playerUuid 
            AND assetHash != NEW.assetHash;
        END;
    `)
    logger.log("[" + "MySQL".yellow + "] " + "unique_active_skin".bold + " trigger ready")
    database.exec(`
        CREATE TRIGGER IF NOT EXISTS unique_active_cape
        AFTER UPDATE OF isSelected ON playersCapes
        FOR EACH ROW
        WHEN NEW.isSelected = 1
        BEGIN
            UPDATE playersCapes 
            SET isSelected = 0 
            WHERE playerUuid = NEW.playerUuid 
            AND id != NEW.id;
        END;
    `)
    logger.log("[" + "MySQL".yellow + "] " + "unique_active_cape".bold + " trigger ready")
    database.exec(`
        CREATE TRIGGER IF NOT EXISTS auto_assign_random_default_skin
        AFTER INSERT ON players
        FOR EACH ROW
        BEGIN
            INSERT INTO playersSkins (playerUuid, assetHash, variant, isSelected)
            SELECT 
                NEW.uuid,
                hash,
                CASE 
                    WHEN hash = '4c7b0468044bfecacc43d00a3a69335a834b73937688292c20d3988cae58248d' THEN 'CLASSIC'
                    ELSE 'SLIM'
                END,
                1
            FROM textures
            WHERE hash IN (
                '4c7b0468044bfecacc43d00a3a69335a834b73937688292c20d3988cae58248d',
                'df8ed96c557d441a63e7b6a4a911ab84fa453b42fc2ae6b01c3e1b02e138168c'
            )
            ORDER BY RANDOM()
            LIMIT 1;
        END;
    `)
    logger.log("[" + "SQLite".yellow + "] " + "auto_assign_random_default_skin".bold + " trigger ready")
    database.exec(`
        CREATE TABLE IF NOT EXISTS playerCertificates (
            uuid VARCHAR(36) PRIMARY KEY,
            privateKey TEXT NOT NULL,
            publicKey TEXT NOT NULL,
            publicKeySignatureV2 TEXT NOT NULL,
            expiresAt TEXT NOT NULL,
            refreshedAfter TEXT NOT NULL,
            FOREIGN KEY (uuid) REFERENCES players(uuid) ON DELETE CASCADE
        )
    `)
    logger.log("[" + "SQLite".yellow + "] " + "playerCertificates".bold + " table ready")
    database.exec(`
        CREATE TABLE IF NOT EXISTS playerProfileActions (
            uuid VARCHAR(36) NOT NULL,
            action VARCHAR(64) NOT NULL,
            createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            PRIMARY KEY (uuid, action),
            FOREIGN KEY (uuid) REFERENCES players(uuid) ON DELETE CASCADE
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "playerProfileActions".bold + " table ready")
}

async function register(email, username, password) {
    try {
        if (checkUsernameAvailability(username)) {
            const sql = `INSERT INTO players (email, username, password, uuid) VALUES (?, ?, ?, ?)`
            const statement = database.prepare(sql)
            const uuid = crypto.randomUUID()
            const hashedPassword = await bcrypt.hash(password, 2)
            const result = statement.run(email, username, hashedPassword, uuid)
            if (result.changes > 0) {
                return { code: 200, email, username, uuid }
            } else {
                return { code: 500, message: "Internal Server Error", error: "Unknown" }
            }
        } else {
            return { code: 422, message: "Illegal Server Character", error: "INVALID_USERNAME_FORMAT" }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function getUser(identifier, requirePassword = false) {
    try {
        const sql = `SELECT * FROM players WHERE uuid = ? OR email = ? OR username = ?`
        const statement = database.prepare(sql)
        const user = statement.get(identifier, identifier, identifier)
        if (!user) {
            return { code: 404, message: "User not found", }
        }
        delete user.email
        if (!requirePassword) {
            delete user.password
        }
        return { code: 200, user }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function addPropertyToPlayer(key, value, uuid) {
    try {
        const sql = `INSERT INTO playersProperties (name, value, uuid) VALUES (?, ?, ?)`
        const statement = database.prepare(sql)
        const result = statement.run(key, value, uuid)
        if (result.changes > 0) {
            return { code: 200, key, value, uuid }
        } else {
            return { code: 500, message: "Internal Server Error", error: "Unknown" }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function deletePropertyToPlayer(key, uuid) {
    try {
        const sql = `DELETE FROM playersProperties WHERE name = ? AND uuid = ?`
        const statement = database.prepare(sql)
        const result = statement.run(key, uuid)
        if (result.changes > 0) {
            return { code: 200, key, uuid }
        } else {
            return { code: 404, message: "Property not found for this user/key combination" }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function upatePropertyToPlayer(key, value, uuid) {
    try {
        const sql = `UPDATE playersProperties SET value = ? WHERE name = ? AND uuid = ?`
        const statement = database.prepare(sql)
        const result = statement.run(value, key, uuid)
        if (result.changes > 0) {
            return { code: 200, key, value, uuid }
        } else {
            return { code: 404, message: "Property not found for this user/key combination", }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function getPlayerProperties(uuid) {
    try {
        const sql = `SELECT * FROM playersProperties WHERE uuid = ?`
        const statement = database.prepare(sql)
        const properties = statement.all(uuid)
        if (properties.length === 0) {
            return { code: 404, message: "Properties not found for this user", }
        }
        return { code: 200, properties: properties.map(property => { return { name: property.name, value: property.value } }) }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function getPlayerProperty(key, uuid) {
    try {
        const sql = `SELECT * FROM playersProperties WHERE name = ? AND uuid = ?`
        const statement = database.prepare(sql)
        const property = statement.get(key, uuid)
        if (!property) {
            return { code: 404, message: "Property not found for this user/key combination", }
        }
        return { code: 200, property }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function insertClientSession(accessToken, clientToken, uuid) {
    try {
        const sql = `INSERT INTO clientSessions (accessToken, clientToken, uuid) VALUES (?, ?, ?)`
        const statement = database.prepare(sql)
        const result = statement.run(accessToken, clientToken, uuid)
        if (result.changes > 0) {
            return { code: 204, accessToken, clientToken }
        } else {
            return { code: 500, message: "Internal Server Error", error: "Unknown" }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function insertLegacyClientSessions(sessionId, uuid) {
    try {
        const deleteSql = `DELETE FROM legacyClientSessions WHERE uuid = ?`
        database.prepare(deleteSql).run(uuid)
        const sql = `INSERT INTO legacyClientSessions (sessionId, uuid) VALUES (?, ?)`
        const statement = database.prepare(sql)
        const result = statement.run(sessionId, uuid)
        if (result.changes > 0) {
            return { code: 200, sessionId, uuid }
        } else {
            return { code: 500, message: "Internal Server Error", error: "Unknown" }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function validateLegacyClientSession(sessionId, uuid) {
    try {
        const sql = `SELECT * FROM legacyClientSessions WHERE sessionId = ? AND uuid = ?`
        const statement = database.prepare(sql)
        
        const session = statement.get(sessionId, uuid) 
        if (session) { 
            return { 
                code: 200, 
                message: "Client session valid."
            } 
        } else {
            return { 
                code: 404, 
                message: "Client session not found for this accessToken/clientToken combination" 
            }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function validateClientSession(accessToken, clientToken) {
    try {
        const sql = `SELECT * FROM clientSessions WHERE accessToken = ? AND clientToken = ?`
        const statement = database.prepare(sql)
        
        const session = statement.get(accessToken, clientToken) 
        if (session) { 
            return { 
                code: 200, 
                message: "Client session valid."
            } 
        } else {
            return { 
                code: 404, 
                message: "Client session not found for this accessToken/clientToken combination" 
            }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function invalidateClientSession(accessToken, clientToken) {
    try {
        const sql = `DELETE FROM clientSessions WHERE accessToken = ? AND clientToken = ?`
        const statement = database.prepare(sql)
        
        const result = statement.run(accessToken, clientToken) 
        if (result.changes > 0) {
            return { 
                code: 200, 
                message: "Client session successfully invalidated." 
            }
        } else {
            return { 
                code: 404, 
                message: "Client session not found for this accessToken/clientToken combination." 
            }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function revokeAccessTokens(uuid) {
    try {
        const sql = `DELETE FROM clientSessions WHERE uuid = ?`
        const statement = database.prepare(sql)

        const result = statement.run(uuid) 
        if (result.changes > 0) {
            return { 
                code: 200, 
                message: "Access tokens successfully revoked." 
            }
        } else {
            return { 
                code: 404, 
                message: "No access token found for this user." 
            }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function getPlayerUsernameAt(uuid, dateInput) {
    try {
        let statement, params
        if (dateInput === 0) {
            statement = database.prepare(`
                SELECT * FROM uuidToNameHistory 
                WHERE uuid = ? AND changedAt IS NULL
            `)
            params = [uuid]
        } 

        else {
            const targetDate = new Date(dateInput).toISOString()
            statement = database.prepare(`
                SELECT *
                FROM uuidToNameHistory
                WHERE uuid = ?
                AND (changedAt <= ? OR changedAt IS NULL)
                ORDER BY changedAt DESC
                LIMIT 1
            `)
            params = [uuid, targetDate]
        }

        const profileAt = statement.get(...params)
        if (!profileAt) {
            return { code: 404, message: "Couldn't find any profile with that name" }
        } else {
            return { code: 200, profileAt: profileAt }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function getPlayerNameHistory(uuid) {
    try {
        const statement = database.prepare(`
            SELECT * FROM uuidToNameHistory 
            WHERE uuid = ? 
            ORDER BY changedAt DESC
        `)
        
        const history = statement.all(uuid)
        if (history.length === 0) {
            return { code: 404, message: "No history found for this UUID" }
        } else {
            return { code: 200, history: history }
        }

    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function getNameUUIDs(username, dateInput) {
    let statement, params

    try {
        if (dateInput === 0) {
            statement = database.prepare(`
                SELECT uuid 
                FROM uuidToNameHistory 
                WHERE username = ? AND changedAt IS NULL
            `)
            params = [username]
        } else {
            const targetDate = new Date(dateInput).toISOString()
            statement = database.prepare(`
                SELECT uuid, username
                FROM uuidToNameHistory
                WHERE username = ?
                AND (changedAt <= ? OR changedAt IS NULL)
                ORDER BY changedAt DESC
                LIMIT 1
            `)
            params = [username, targetDate]
        }

        const profileAt = statement.get(...params)
        if (!profileAt) {
            return { code: 404, message: "Couldn't find any profile with that name" }
        } else {
            return { code: 200, profileAt: profileAt }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function banServer(hashedIp, banner = "CONSOLE", reason = null) {
    try {
        const sql = `INSERT OR REPLACE INTO blockedServers (hashedIp, banner, reason) VALUES (?, ?, ?)`
        const statement = database.prepare(sql)
        const result = statement.run(hashedIp, banner, reason)

        if (result.changes > 0) {
            return { code: 200, hashedIp, banner, reason }
        } else {
            return { code: 500, message: "Internal Server Error", error: "No changes made" }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function unbanServer(hashedIp) {
    try {
        const sql = `DELETE FROM blockedServers WHERE hashedIp = ?`
        const statement = database.prepare(sql)
        const result = statement.run(hashedIp)

        if (result.changes > 0) {
            return { code: 200, message: "Server unbanned successfully", hashedIp }
        } else {
            return { code: 404, message: "Server not found in blocked list", error: "Not Found" }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function getBlockedServers() {
    try {
        const sql = `SELECT * FROM blockedServers`
        const statement = database.prepare(sql)
        const blockedServers = statement.all()

        return { code: 200, blockedServers: blockedServers.map(bannedServer => { return { sha1: bannedServer.hashedIp } }) }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function getServerBanDetails(hashedIp) {
    try {
        const sql = `SELECT * FROM blockedServers WHERE hashedIp = ?`
        const statement = database.prepare(sql)
        const details = statement.get(hashedIp)

        if (details) {
            return { code: 200, details }
        } else {
            return { code: 404, message: "Server is not blocked", error: "Not Found" }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function getPlayerPrivileges(uuid) {
    try {
        const sql = `
            SELECT onlineChat, multiplayerServer, multiplayerRealms, telemetry 
            FROM playersPrivileges 
            WHERE uuid = ?
        `
        const statement = database.prepare(sql)
        const data = statement.get(uuid)

        if (data) {
            return { 
                code: 200, 
                message: "Privileges retrieved successfully.", 
                data: data
            }
        } else {
            return { 
                code: 404, 
                message: "Privileges not found for this UUID." 
            }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function getPlayerPreferences(uuid) {
    try {
        const sql = `
            SELECT profanityFilter 
            FROM playersPreferences 
            WHERE uuid = ?
        `
        const statement = database.prepare(sql)
        const data = statement.get(uuid)

        if (data) {
            return { 
                code: 200, 
                message: "Preferences retrieved successfully.", 
                data: data
            }
        } else {
            return { 
                code: 404, 
                message: "Preferences not found for this UUID." 
            }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function updatePlayerPrivileges(uuid, updates) {
    try {
        const keys = Object.keys(updates)

        if (keys.length === 0) {
            return { code: 400, message: "No fields provided for update." }
        }

        const setClause = keys.map(key => `"${key}" = ?`).join(', ')
        const sql = `UPDATE playersPrivileges SET ${setClause} WHERE uuid = ?`

        const values = keys.map(key => updates[key])
        values.push(uuid)

        const statement = database.prepare(sql)
        const result = statement.run(...values)

        if (result.changes > 0) {
            return { 
                code: 200, 
                message: "Privileges updated successfully." 
            }
        } else {
            return { 
                code: 404, 
                message: "Player privileges not found or no changes made." 
            }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function updatePlayerPreferences(uuid, updates) {
    try {
        const keys = Object.keys(updates)

        if (keys.length === 0) {
            return { code: 400, message: "No fields provided for update." }
        }

        const setClause = keys.map(key => `"${key}" = ?`).join(', ')
        const sql = `UPDATE playersPreferences SET ${setClause} WHERE uuid = ?`

        const values = keys.map(key => updates[key])
        values.push(uuid)

        const statement = database.prepare(sql)
        const result = statement.run(...values)

        if (result.changes > 0) {
            return { 
                code: 200, 
                message: "Preferences updated successfully." 
            }
        } else {
            return { 
                code: 404, 
                message: "Player preferences not found or no changes made." 
            }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function banUser(uuid, { reasonKey, reasonMessage, expires = null }) {
    try {
        if (!uuid || !reasonKey) {
            return { code: 400, message: "Missing uuid or reasonKey." }
        }

        const doBan = database.transaction((targetUuid, rKey, rMsg, exp) => {
            let reasonRow = database.prepare("SELECT id FROM banReasons WHERE key = ?").get(rKey)
            let reasonId
            if (reasonRow) {
                reasonId = reasonRow.id
            } else {
                const info = database.prepare("INSERT INTO banReasons (key) VALUES (?)").run(rKey)
                reasonId = info.lastInsertRowid
            }

            const banId = crypto.randomUUID()
            const insert = database.prepare(`
                INSERT INTO bans (banId, uuid, reason, reasonMessage, expires)
                VALUES (?, ?, ?, ?, ?)
            `)
            insert.run(banId, targetUuid, reasonId, rMsg || "Banned by operator", exp)

            return banId
        })
        const newBanId = doBan(uuid, reasonKey, reasonMessage, expires)
        return { 
            code: 200, 
            message: "User successfully banned.", 
            banId: newBanId 
        }
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
            return { code: 404, message: "User not found (cannot ban a ghost)." }
        }
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function unbanUser(uuid) {
    try {
        if (!uuid) {
            return { code: 400, message: "Missing uuid." }
        }
        const statement = database.prepare("DELETE FROM bans WHERE uuid = ?")
        const result = statement.run(uuid)

        if (result.changes > 0) {
            return { 
                code: 200, 
                message: "User successfully unbanned.", 
                count: result.changes
            }
        } else {
            return { 
                code: 404, 
                message: "User was not banned." 
            }
        }

    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function getPlayerBans(uuid) {
    try {
        const sql = `
            SELECT 
                b.banId, 
                b.expires, 
                b.reasonMessage, 
                r.key as reason
            FROM bans b
            JOIN banReasons r ON b.reason = r.id
            WHERE b.uuid = ?
            ORDER BY b.expires ASC
        `
        const statement = database.prepare(sql)
        const result = statement.all(uuid)
        if (result.length > 0) {
            return { code: 200, bans: result }
        } else {
            return { code: 204 }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

function getPlayerSettingsSchema() {
    const RAW_SCHEMA_CACHE = {
        privileges: {},
        preferences: {}
    }
    try {
        const privilegesStatement = database.prepare("PRAGMA table_info(playersPrivileges)")
        const privilegesResult = privilegesStatement.all()
        const preferencesStatement = database.prepare("PRAGMA table_info(playersPreferences)")
        const preferencesResult = preferencesStatement.all()

        RAW_SCHEMA_CACHE.privileges = privilegesResult.map(c => c.name).filter(n => n !== "uuid"),
        RAW_SCHEMA_CACHE.preferences = preferencesResult.map(c => c.name).filter(n => n !== "uuid")

        return RAW_SCHEMA_CACHE
    } catch (err) {
        console.error("Database Schema Error:", err)
        throw err
    }
}

async function blockPlayer(blockerUuid, blockedUuid) {
    try {
        const sql = `INSERT OR IGNORE INTO playersBlockslist (blockerUuid, blockedUuid) VALUES (?, ?)`
        const res = database.prepare(sql).run(blockerUuid, blockedUuid)
        return { code: 200, changed: res.changes > 0 }
    } catch (err) {
        return { code: 500, error: err.toString() }
    }
}

async function unblockPlayer(blockerUuid, blockedUuid) {
    try {
        const sql = `DELETE FROM playersBlockslist WHERE blockerUuid = ? AND blockedUuid = ?`
        const res = database.prepare(sql).run(blockerUuid, blockedUuid)
        return { code: 200, changed: res.changes > 0 }
    } catch (err) {
        return { code: 500, error: err.toString() }
    }
}

async function getBlockedUuids(blockerUuid) {
    try {
        const sql = `SELECT blockedUuid FROM playersBlockslist WHERE blockerUuid = ?`
        const statement = database.prepare(sql)
        const result = statement.all(blockerUuid)
        return { code: 200, data: result.map(r => r.blockedUuid) }
    } catch (err) {
        return { code: 500, error: err.toString() }
    }
}

async function isBlocked(blockerUuid, targetUuid) {
    try {
        const sql = `
            SELECT 1 FROM playersBlockslist 
            WHERE blockerUuid = ? AND blockedUuid = ? 
            LIMIT 1
        `
        const row = database.prepare(sql).get(blockerUuid, targetUuid)
        return { code: 200, isBlocked: !!row }
    } catch (err) {
        return { code: 500, error: err.toString() }
    }
}

function getUsernamesRules() {
    try {
        let USERNAME_RULES_CACHE = []
        const statement = database.prepare("SELECT rule, type FROM usernameRules")
        const result = statement.all()
        USERNAME_RULES_CACHE = result.map(row => {
            if (row.type === 1) {
                return { type: "regex", pattern: new RegExp(row.rule, "i") }
            } else {
                return { type: "literal", value: row.rule.toLowerCase() }
            }
        })
        
        return USERNAME_RULES_CACHE
    } catch (err) {
        throw err
    }
}

function checkUsernameAvailability(username) {
    if (!usernameRegex.test(username)) {
        return { code: 200, allowed: false, message: "Invalid format (3-16 alphanumeric chars)." }
    }

    const blocklist = getUsernamesRules()
    const normalizedUsername = username.toLowerCase()

    for (const entry of blocklist) {
        if (entry.type === "literal") {
            if (normalizedUsername === entry.value) {
                return { code: 200, allowed: false, message: "This username is reserved." }
            }
        } 
        else if (entry.type === "regex") {
            if (entry.pattern.test(username)) {
                return { code: 200, allowed: false, message: "This username contains forbidden patterns." }
            }
        }
    }

    return { code: 200, allowed: true }
}

async function getPlayerNameChangeStatus(uuid) {
    try {
        const playerSql = `SELECT createdAt, nameChangeAllowed FROM players WHERE uuid = ?`
        const player = database.prepare(playerSql).get(uuid)

        if (!player) {
            return { code: 404, message: "User not found" }
        }

        const historySql = `
            SELECT changedAt 
            FROM uuidToNameHistory 
            WHERE uuid = ? AND changedAt IS NOT NULL
            ORDER BY changedAt DESC 
            LIMIT 1
        `
        const history = database.prepare(historySql).get(uuid)

        const response = {
            changedAt: history ? history.changedAt : player.createdAt, 
            createdAt: player.createdAt,
            nameChangeAllowed: !!player.nameChangeAllowed 
        }

        return { code: 200, data: response }

    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function getPlayerSkins(playerUuid) {
    try {
        const sql = `
            SELECT 
                t.uuid as id,  -- On utilise l'UUID de la texture comme ID
                ps.variant, 
                ps.isSelected, 
                t.url, 
                t.hash as textureKey
            FROM playersSkins ps
            JOIN textures t ON ps.assetHash = t.hash
            WHERE ps.playerUuid = ?
        `;
        const skins = database.prepare(sql).all(playerUuid)
        return { code: 200, skins }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function getPlayerCapes(playerUuid) {
    try {
        const sql = `
            SELECT 
                t.uuid as id, 
                pc.isSelected, 
                t.url, 
                t.hash as textureKey, 
                t.alias
            FROM playersCapes pc
            JOIN textures t ON pc.assetHash = t.hash
            WHERE pc.playerUuid = ?
        `
        const capes = database.prepare(sql).all(playerUuid)
        return { code: 200, capes }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

async function deletePlayerSkin(playerUuid, textureUuid) {
    try {
        const deleteSql = `
            DELETE FROM playersSkins 
            WHERE playerUuid = ? 
            AND assetHash = (SELECT hash FROM textures WHERE uuid = ?)
        `
        const deleteStatement = database.prepare(deleteSql)
        const deleteResult = deleteStatement.run(playerUuid, textureUuid)
        
        if (deleteResult.changes > 0) {
            return { code: 200, message: "Skin deleted" }
        }
        return { code: 404, message: "Skin not found in wardrobe" }

    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

async function changeUsername(uuid, newName) {
    try {
        const sql = "UPDATE players SET username = ? WHERE uuid = ?"
        const result = database.prepare(sql).run(newName, uuid)
        
        if (result.changes > 0) {
            return { code: 200, message: "Username changed successfully" }
        }
        return { code: 404, message: "User not found" }
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return { code: 409, message: "Username already taken" }
        }
        return { code: 500, error: error.toString() }
    }
}

async function hideCape(playerUuid) {
    try {
        const sql = "UPDATE playersCapes SET isSelected = 0 WHERE playerUuid = ?"
        const statement = database.prepare(sql)
        const result = statement.run(playerUuid)
        
        return { code: 200, message: "Cape hidden (unequipped)" }
    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

async function showCape(playerUuid, textureUuid) {
    try {
        const hashSql = "SELECT hash FROM textures WHERE uuid = ?"
        const textureStatement = database.prepare(hashSql)
        const textureResult = textureStatement.get(textureUuid)

        if (!textureResult) {
            return { code: 404, message: "Cape texture not found in server assets" }
        }

        const sql = `
            UPDATE playersCapes 
            SET isSelected = 1 
            WHERE playerUuid = ? AND assetHash = ?
        `
        const statement = database.prepare(sql)
        const result = statement.run(playerUuid, textureResult.hash)

        if (result.changes > 0) {
            return { code: 200, message: "Cape equipped" }
        } else {
            return { code: 403, message: "You do not own this cape." }
        }
    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

async function resetSkin(playerUuid) {
    try {
        const STEVE_HASH = "4c7b0468044bfecacc43d00a3a69335a834b73937688292c20d3988cae58248d"
        const ALEX_HASH = "df8ed96c557d441a63e7b6a4a911ab84fa453b42fc2ae6b01c3e1b02e138168c"

        const isSteve = Math.random() < 0.5
        const targetHash = isSteve ? STEVE_HASH : ALEX_HASH
        const variant = isSteve ? "CLASSIC" : "SLIM"

        const insertSql = `
            INSERT OR IGNORE INTO playersSkins (playerUuid, assetHash, variant, isSelected)
            VALUES (?, ?, ?, 0)
        `
        const insertStatement = database.prepare(insertSql)
        insertStatement.run(playerUuid, targetHash, variant)

        const updateSql = `
            UPDATE playersSkins 
            SET isSelected = 1 
            WHERE playerUuid = ? AND assetHash = ?
        `
        const updateStatement = database.prepare(updateSql)
        const updateResult = updateStatement.run(playerUuid, targetHash)

        return { 
            code: 200, 
            message: "Skin reset successfully", 
            model: variant 
        }
    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

async function setSkin(playerUuid, textureUuid, variant = "CLASSIC") {
    try {
        const selectSql = "SELECT hash FROM textures WHERE uuid = ? AND type = 'SKIN'"
        const selectStatement = database.prepare(selectSql)
        const texture = selectStatement.get(textureUuid)

        if (!texture) {
            return { code: 404, message: "Texture not found or not a SKIN" }
        }

        const insertSql = `
            INSERT OR REPLACE INTO playersSkins (playerUuid, assetHash, variant, isSelected)
            VALUES (?, ?, ?, 1)
        `
        const insertStatement = database.prepare(insertSql)
        const insertResult = insertStatement.run(playerUuid, texture.hash, variant)

        return { code: 200, message: "Skin set successfully" }

    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

async function addCapeToWardrobe(playerUuid, textureUuid) {
    try {
        const texSql = "SELECT hash FROM textures WHERE uuid = ? AND type = 'CAPE'"
        const statement = database.prepare(texSql)
        const texture = statement.get(textureUuid)

        if (!texture) {
            return { code: 404, message: "Texture not found or not a CAPE" }
        }

        const sql = `
            INSERT OR REPLACE INTO playersCapes (playerUuid, assetHash, isSelected)
            VALUES (?, ?, ?)
        `
        const insertStatement = database.prepare(sql)
        const insertResult = insertStatement.run(playerUuid, texture.hash, 0)

        return { code: 200, message: "Cape added to wardrobe" }
    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

function registerTexture(hash, type, url, alias = null) {
    try {
        const selectSql = "SELECT uuid FROM textures WHERE hash = ?"
        const selectStatement = database.prepare(selectSql)
        const existingTexture = selectStatement.get(hash)

        if (existingTexture) {
            return { 
                code: 200, 
                textureUuid: existingTexture.uuid, 
                isNew: false 
            }
        }

        const uuid = crypto.randomUUID()
        const insertSql = `
            INSERT INTO textures (uuid, hash, type, url, alias) 
            VALUES (?, ?, ?, ?, ?)
        `
        const insertStatement = database.prepare(insertSql)
        const insertResult = insertStatement.run(uuid, hash, type, url, alias)

        return { 
            code: 201, 
            textureUuid: uuid, 
            isNew: true 
        }

    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

async function getPlayerCertificate(uuid) {
    try {
        const sql = "SELECT * FROM playerCertificates WHERE uuid = ?"
        const statement = database.prepare(sql)
        const cert = statement.get(uuid)

        if (cert) {
            return { code: 200, data: cert }
        }
        return { code: 404, message: "Certificate not found" }
    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

async function savePlayerCertificate(uuid, privateKey, publicKey, signatureV2, expiresAt, refreshedAfter) {
    try {
        const sql = `
            INSERT OR REPLACE INTO playerCertificates 
            (uuid, privateKey, publicKey, publicKeySignatureV2, expiresAt, refreshedAfter)
            VALUES (?, ?, ?, ?, ?, ?)
        `
        const statement = database.prepare(sql)
        
        const result = statement.run(
            uuid, 
            privateKey, 
            publicKey, 
            signatureV2, 
            expiresAt, 
            refreshedAfter
        )

        if (result.changes > 0) {
            return { code: 200, message: "Certificate saved" }
        }
        return { code: 500, message: "Failed to save certificate" }

    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

async function deleteExpiredCertificates(isoDate) {
    try {
        const sql = "DELETE FROM playerCertificates WHERE expiresAt < ?"
        const statement = database.prepare(sql)
        const result = statement.run(isoDate)

        return { 
            code: 200, 
            deletedCount: result.changes 
        }
    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

async function addProfileAction(uuid, actionCode) {
    try {
        const cleanUuid = uuid.replace(/-/g, "")
        const sql = "INSERT OR IGNORE INTO playerProfileActions (uuid, action) VALUES (?, ?)"
        const statement = database.prepare(sql)
        const result = statement.run(cleanUuid, actionCode)

        return { 
            code: 200, 
            success: true,
            added: result.changes > 0
        }
    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

async function removeProfileAction(uuid, actionCode) {
    try {
        const cleanUuid = uuid.replace(/-/g, "")
        const sql = "DELETE FROM playerProfileActions WHERE uuid = ? AND action = ?"
        const statement = database.prepare(sql)
        const result = statement.run(cleanUuid, actionCode)

        return { 
            code: 200, 
            deletedCount: result.changes 
        };
    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

async function getPlayerActions(uuid) {
    try {
        const cleanUuid = uuid.replace(/-/g, "")
        const sql = "SELECT action FROM playerProfileActions WHERE uuid = ?"
        const statement = database.prepare(sql)
        const rows = statement.all(cleanUuid)

        
        const actionsList = rows.map(row => row.action)

        return { 
            code: 200, 
            actions: actionsList 
        }
    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

async function clearAllPlayerActions(uuid) {
    try {
        const cleanUuid = uuid.replace(/-/g, "")
        const sql = "DELETE FROM playerProfileActions WHERE uuid = ?"
        const statement = database.prepare(sql)
        const result = statement.run(cleanUuid)

        return { 
            code: 200, 
            deletedCount: result.changes 
        };
    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

async function getActiveSkin(uuid) {
    try {
        // CORRECTION : On utilise l'UUID tel quel (avec les tirets) 
        // car c'est ainsi qu'il est stocké dans la table playersSkins.
        
        const sql = `
            SELECT t.url, ps.variant 
            FROM playersSkins ps
            JOIN textures t ON ps.assetHash = t.hash
            WHERE ps.playerUuid = ? AND ps.isSelected = 1
        `
        const statement = database.prepare(sql)
        const skin = statement.get(uuid)

        return { code: 200, data: skin || null }
    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

async function getActiveCape(uuid) {
    try {
        const sql = `
            SELECT t.url 
            FROM playersCapes pc
            JOIN textures t ON pc.assetHash = t.hash
            WHERE pc.playerUuid = ? AND pc.isSelected = 1
        `
        const statement = database.prepare(sql)
        const cape = statement.get(uuid)

        return { code: 200, data: cape || null }
    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

async function getProfileActionsList(uuid) {
    try {
        const cleanUuid = uuid.replace(/-/g, "")
        const sql = "SELECT action FROM playerProfileActions WHERE uuid = ?"
        const statement = database.prepare(sql)
        const rows = statement.all(cleanUuid)

        const actions = rows.map(row => row.action)

        return { code: 200, data: actions }
    } catch (error) {
        return { code: 500, error: error.toString() }
    }
}

module.exports = {
    setup,
    getUser,
    setSkin,
    banUser,
    register,
    showCape,
    hideCape,
    banServer,
    resetSkin,
    unbanUser,
    isBlocked,
    blockPlayer,
    unbanServer,
    getNameUUIDs,
    getPlayerBans,
    getActiveSkin,
    getActiveCape,
    unblockPlayer,
    getPlayerCapes,
    changeUsername,
    getPlayerSkins,
    registerTexture,
    getBlockedUuids,
    getPlayerActions,
    addProfileAction,
    deletePlayerSkin,
    getBlockedServers,
    getUsernamesRules,
    addCapeToWardrobe,
    getPlayerProperty,
    revokeAccessTokens,
    removeProfileAction,
    getServerBanDetails,
    getPlayerPrivileges,
    addPropertyToPlayer,
    getPlayerProperties,
    getPlayerUsernameAt,
    insertClientSession,
    getPlayerPreferences,
    getPlayerCertificate,
    getPlayerNameHistory,
    clearAllPlayerActions,
    validateClientSession,
    getProfileActionsList,
    upatePropertyToPlayer,
    savePlayerCertificate,
    deletePropertyToPlayer,
    updatePlayerPrivileges,
    invalidateClientSession,
    updatePlayerPreferences,
    getPlayerSettingsSchema,
    checkUsernameAvailability,
    deleteExpiredCertificates,
    getPlayerNameChangeStatus,
    insertLegacyClientSessions,
    validateLegacyClientSession,
}