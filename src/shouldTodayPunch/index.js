const holiday = require('taiwan-holiday')
const dayjs = require('dayjs')
const today = dayjs().add(8, 'hour')
const trim = require('lodash/trim')

const validateVacation = require('./validateVacation')
const {
  urls,
  selectors
} = require('../../config')

const _isTodayHoliday = async () => {
  const result = await holiday
    .init()
    .then(() => {
      return holiday.isHoliday(today.format('YYYY/MM/DD'))
    })
  return result
}

const _isTodayVacation = async (browser, { action, name, id, today }) => {
  const pageCheckVacation = await browser.newPage()
  await pageCheckVacation.goto(urls.pageCheckVacation)

  await pageCheckVacation.type(selectors.vacation.inputStartDate, today.format('YYYYMMDD'))
  await pageCheckVacation.type(selectors.vacation.inputEndDate, today.format('YYYYMMDD'))
  const submitBtn = await pageCheckVacation.$(selectors.vacation.submit)
  await submitBtn.click()

  await pageCheckVacation.waitForNavigation({ waitUntil: 'networkidle0' })
  const table = await pageCheckVacation.$(selectors.vacation.table)
  try {
    let text = await table.$eval(
      selectors.vacation.emptyDataHint,
      element => element.textContent
    )
    text = trim(text)
    return !(text === 'No data to display')
  } catch (e) {
    const cells = await table.$$eval(
      selectors.vacation.nonEmptyDataRow,
      nodes => nodes.map(node => node.textContent)
    )
    return validateVacation(cells, { action, name, id, today })
  }
}

module.exports = async (browser, { action, name, id }) => {
  console.log(`${name}/${id}/punch-${action}: Check holiday/vacation for ${name}/${id}`)
  const isTodayHoliday = await _isTodayHoliday()

  // This line wont't exec while isTodayHoliday is true
  const isTodayVacation = await _isTodayVacation(browser, { action, name, id, today })

  if (isTodayHoliday) {
    console.log(`${name}/${id}/punch-${action}: Today(${today.format('YYYY/MM/DD')}) is holiday`)
  }
  if (isTodayVacation) {
    console.log(`${name}/${id}/punch-${action}: Today(${today.format('YYYY/MM/DD')}) is ${name}/${id}'s vacation`)
  }

  return !isTodayHoliday && !isTodayVacation
}