export default (value: any) => {
  if (Buffer.isBuffer(value)) `0x${value.toString('hex')}`
  return `0x${parseInt(value).toString(16)}`
}
