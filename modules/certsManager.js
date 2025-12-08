const fs = require("node:fs") 
const path = require("node:path")
const crypto = require("node:crypto")
const keysRoot = path.join(__dirname, "..", "data", "keys")

function generateKeysPair() { 
    try {
        const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: "spki",
                format: "pem"
            },
            privateKeyEncoding: {
                type: "pkcs8",
                format: "pem"
            }
        })
        return { privateKey, publicKey }
    } catch (error) {
        console.error("Erreur lors de la génération des clés :", error)
        return { publicKey: null, privateKey: null }
    }
}

function setupKeys() {
    if (!fs.existsSync(keysRoot)) {
        fs.mkdirSync(keysRoot, { recursive: true })
    }
    if (!fs.existsSync(path.join(keysRoot, "authenticationKeys-public.pem")) || !fs.existsSync(path.join(keysRoot, "authenticationKeys-private.pem"))) {
        const { publicKey, privateKey } = generateKeysPair()
        fs.writeFileSync(path.join(keysRoot, "authenticationKeys-public.pem"), publicKey)
        fs.writeFileSync(path.join(keysRoot, "authenticationKeys-private.pem"), privateKey)
    }
    if (!fs.existsSync(path.join(keysRoot, "profilePropertyKeys-public.pem")) || !fs.existsSync(path.join(keysRoot, "profilePropertyKeys-private.pem"))) {
        const { publicKey, privateKey } = generateKeysPair()
        fs.writeFileSync(path.join(keysRoot, "profilePropertyKeys-public.pem"), publicKey)
        fs.writeFileSync(path.join(keysRoot, "profilePropertyKeys-private.pem"), privateKey)
    }
}

function getKeys() {
    const keysList = ["authenticationKeys", "profilePropertyKeys"]
    const keys = {}
    for (const key of keysList) {
        keys[key] = {}
        keys[key].public = fs.readFileSync(path.join(keysRoot, `${key}-public.pem`)).toString("utf8")
        keys[key].private = fs.readFileSync(path.join(keysRoot, `${key}-private.pem`)).toString("utf8")
    }
    return keys
}

function extractKeyFromPem(pemKey) {
    const keyRegex = /-----BEGIN (?:PUBLIC|PRIVATE) KEY-----\s*([\s\S]+?)\s*-----END (?:PUBLIC|PRIVATE) KEY-----/
    const match = pemKey.match(keyRegex)
    if (match && match[1]) {
        const rawKey = match[1].replace(/\s/g, "")
        return rawKey
    }
    return null
}

module.exports = {
    extractKeyFromPem,
    setupKeys,
    getKeys,
}