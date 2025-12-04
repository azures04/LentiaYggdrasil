function getMinMaxFromRegex(regexString) {
    const extractionRegex = /\{(?<min>\d+),(?<max>\d+)\}/
    const match = regexString.match(extractionRegex)

    if (match && match.groups) {
        return {
            min: parseInt(match.groups.min, 10),
            max: parseInt(match.groups.max, 10)
        };
    } else {
        return {
            min: 2,
            max: 16
        }
    }
}

module.exports = {
    getMinMaxFromRegex
}