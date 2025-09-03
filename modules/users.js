const fs = require("node:fs")
const path = require("node:path")
const bcrypt = require("bcryptjs")
const uuid = require("uuid")

function addUser(name, password, discordProfile = undefined) {
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "users.json")))
    const userUuid = uuid.v4()
    users[userUuid] = {
        name,
        id: userUuid,
        password: hashPassword(password),
        discordProfile
    }
    fs.writeFileSync(path.join(__dirname, "..", "users.json"), JSON.stringify(users))
}

function renameUser(uuid, newName) {
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "users.json")))
    users[uuid].name = newName
    fs.writeFileSync(path.join(__dirname, "..", "users.json"), JSON.stringify(users))
}

function removeUser(uuid) {
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "users.json")))
    delete users[uuid]
    fs.writeFileSync(path.join(__dirname, "..", "users.json"), JSON.stringify(users))
}

function login(username, password) {
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "users.json")))
    const user = users.find($user => $user.username == username)
    if (user) {
        if (bcrypt.compareSync(password, user.password)) {
            return {
                status: 200
            }
        } else {
            return {
                status: 403,
                message: "Bad credentials."
            }
        }
    } else {
        return {
            status: 404,
            message: "Player not found."
        }
    }
}

function loginWithDiscord(discordId) {
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "users.json")))
    const user = users.find($user => $user.discordProfile == discordId)
    if (user) {
        return {
            code: 200,
        }
    } else {
        return {
            code: 404,
            message: "Player not found or this discord account isn't linked to a player. "
        }
    }
}

function hashPassword(password) {
    const SALT = this.randomInteger(1, 16)
    return bcrypt.hashSync(password, SALT)
}

module.exports = {
    addUser,
    removeUser,
    renameUser,
    login,
    loginWithDiscord
}