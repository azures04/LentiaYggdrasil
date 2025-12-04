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
        path: reqPath,
        code: status,
        message: result.message || "Internal Server Error",
        error: result.error || "Unknown"
    })
}

function handleYggdrasilError(res, status, error, cause, errorMessage) {
    return res.status(status).json({
        error,
        cause,
        errorMessage
    })
}

module.exports = {
    handleError,
    getMinMaxFromRegex,
    handleYggdrasilError,
    getRegistrationCountryFromIp,
}