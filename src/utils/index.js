export const reS = obj => JSON.parse(JSON.stringify(obj))

export const dictZip = (key_array, val_array) => {
  if (key_array.length <= val_array.length) {
    return key_array.reduce((acc, curr, index) => {
      acc[curr] = val_array[index]
      return acc
    }, {})
  } else {
    throw new Error("Wrong length")
  }
}

export const formatOffsetTime = (offsetInSeconds) => {
  const sign = offsetInSeconds < 0 ? "-" : "+"
  const absOffset = Math.abs(offsetInSeconds)
  const hours = Math.floor(absOffset / 3600)
  const minutes = Math.floor((absOffset % 3600) / 60)
  return `${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}
