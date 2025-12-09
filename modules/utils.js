const usernameRegex = /^[a-zA-Z0-9]{3,16}$/
const database = require("./database")

function getMinMaxFromRegex(regexString) {
    const extractionRegex = /\{(?<min>\d+),(?<max>\d+)\}/
    const match = regexString.match(extractionRegex)

    if (match && match.groups) {
        return {
            min: parseInt(match.groups.min, 10),
            max: parseInt(match.groups.max, 10)
        }
    } else {
        return {
            min: 2,
            max: 16
        }
    }
}

async function getRegistrationCountryFromIp(ipAddress) {
    const apiUrl = `http://ip-api.com/json/${ipAddress}?fields=countryCode`

    try {
        const response = await fetch(apiUrl)

        if (!response.ok) {
            return "FR"
        }

        const data = await response.json()

        if (data && data.countryCode) {
            const countryCode = data.countryCode
            return countryCode
        } else {
            return "FR"
        }

    } catch (error) {
        return "FR"
    }
}

function handleError(res, status, result, reqPath) {
    return res.status(status).json({
        path: reqPath.replace(/:(\w+)/g, "<$1>"),
        code: status,
        message: result.message || "Internal Server Error",
        error: result.error || "Unknown"
    })
}

function handleAuthError(res, status, error, cause, errorMessage) {
    return res.status(status).json({
        error,
        cause,
        errorMessage
    })
}

function handleAccountsAPIError(res, status, reqPath, error, errorMessage) {
    const $error = {}
    if (reqPath && reqPath.trim() != "") {
        $error.path = reqPath.replace(/:(\w+)/g, "<$1>")
    }
    if (error && error.trim() != "") {
        $error.error = error
    }
    if (errorMessage && errorMessage.trim() != "") {
        $error.errorMessage = errorMessage
    }
    return res.status(status).json($error)
}

function toTimestamp(dateStr) {
    if (!dateStr) {
        return null
    }
    return new Date(dateStr + "Z").getTime()
}

function isValidTimestamp(input) {
    const timestamp = Number(input)
    if (isNaN(timestamp)) {
        return false
    }

    if (timestamp < 0) {
        return false
    }

    const MAX_JS_DATE = 8640000000000000
    if (timestamp > MAX_JS_DATE) {
        return false
    }

    return true
}

function addDashesToUUID(uuid) {
    if (typeof uuid !== "string" || uuid.length !== 32) {
        return uuid
    }

    return (
        uuid.slice(0, 8) + "-" +
        uuid.slice(8, 12) + "-" +
        uuid.slice(12, 16) + "-" +
        uuid.slice(16, 20) + "-" +
        uuid.slice(20)
    )
}

function normalizeBooleanFields(data) {
    if (!data || typeof data !== "object") {
        return data
    }

    for (const key in data) {
        const value = data[key]

        if (typeof value === "object" && value !== null) {
            normalizeBooleanFields(value)
        }
        
        else if (key.endsWith("Allowed")) {
            data[key] = !!value
        }
    }

    return data
}

function signProfileData(dataBase64) {
    try {
        const privateKey = serverKeys.playerCertificateKeys.private
        const signer = crypto.createSign("SHA1")
        signer.update(dataBase64)
        signer.end()
        return signer.sign(privateKey, "base64")
    } catch (err) {
        console.error("Signing failed:", err)
        return null
    }
}

module.exports = {
    toTimestamp,
    handleError,
    signProfileData,
    addDashesToUUID,
    handleAuthError,
    isValidTimestamp,
    getMinMaxFromRegex,
    handleAccountsAPIError,
    normalizeBooleanFields,
    getRegistrationCountryFromIp,
}