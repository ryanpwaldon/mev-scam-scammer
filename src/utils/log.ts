export default (message: any | any[]) => {
  if (typeof message === 'string') return console.log(message)
  message.forEach((line: any) => console.log(`${line}`))
}
