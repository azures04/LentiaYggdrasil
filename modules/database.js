const path = require("node:path")
const utils = require("./utils")
const config = require("../config.json")
const Logger = require("./logger")
const crypto = require("node:crypto")
const bcrypt = require("bcryptjs")
const logger = new Logger(path.join(__dirname, ".."))
const Databse = require("better-sqlite3")
const databse = new Databse(path.join(__dirname, "..", "data", "database.db"))
const regex = /^[a-zA-Z0-9]{3,16}$/

async function setup() {
    databse.exec(`
        CREATE TABLE IF NOT EXISTS players (
            email TEXT NULL,
            username VARCHAR(${utils.getMinMaxFromRegex(config.players.usernameRegex).max}) NOT NULL,
            password TEXT NOT NULL,
            uuid VARCHAR(36) NOT NULL UNIQUE PRIMARY KEY
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "players".bold + " table created or is already existing"),
    databse.exec(`
        CREATE TABLE IF NOT EXISTS playersProperties (
            name VARCHAR(256) NOT NULL,
            value VARCHAR(512) NOT NULL,
            uuid VARCHAR(36) NOT NULL,
            FOREIGN KEY (uuid) REFERENCES players(uuid)
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "playersProperties".bold + " table created or is already existing")
    databse.exec(`
        CREATE TABLE IF NOT EXISTS clientSessions (
            accessToken TEXT NOT NULL,
            clientToken VARCHAR(36) NOT NULL,
            uuid VARCHAR(36) NOT NULL,
            FOREIGN KEY (uuid) REFERENCES players(uuid)
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "clientSessions".bold + " table created or is already existing")
    databse.exec(`
        CREATE TABLE IF NOT EXISTS legacyClientSessions (
            sessionId VARCHAR(36) NOT NULL,
            uuid VARCHAR(36) NOT NULL,
            FOREIGN KEY (uuid) REFERENCES players(uuid)
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "legacyClientSessions".bold + " table created or is already existing")
}

async function register(email, username, password) {
    try {
        if (regex.test(username)) {
            const sql = `INSERT INTO players (email, username, password, uuid) VALUES (?, ?, ?, ?)`
            const statement = databse.prepare(sql)
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
        const statement = databse.prepare(sql)
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
        const statement = databse.prepare(sql)
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
        const statement = databse.prepare(sql)
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
        const statement = databse.prepare(sql)
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
        const statement = databse.prepare(sql)
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
        const statement = databse.prepare(sql)
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
        const statement = databse.prepare(sql)
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
        databse.prepare(deleteSql).run(uuid)
        const sql = `INSERT INTO legacyClientSessions (sessionId, uuid) VALUES (?, ?)`
        const statement = databse.prepare(sql)
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
        const statement = databse.prepare(sql)
        
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
        const statement = databse.prepare(sql)
        
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
        const statement = databse.prepare(sql)
        
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
        const statement = databse.prepare(sql)

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

module.exports = {
    setup,
    getUser,
    register,
    getPlayerProperty,
    revokeAccessTokens,
    addPropertyToPlayer,
    getPlayerProperties,
    insertClientSession,
    validateClientSession,
    upatePropertyToPlayer,
    deletePropertyToPlayer,
    invalidateClientSession,
    insertLegacyClientSessions,
    validateLegacyClientSession,
}