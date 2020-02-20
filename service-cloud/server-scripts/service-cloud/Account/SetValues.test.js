import path from 'path'
import { describe, it } from 'mocha'
import { expect } from 'chai'
import { compose } from '@cortezaproject/corteza-js'
import SetValues from './SetValues'
const { Record, getModuleFromYaml } = compose

describe(__filename, () => {
  const modulesYaml = path.join(__dirname, '../../../', 'config', '1100_modules.yaml')
  const recordID = '1'

  const accountModule = getModuleFromYaml('Account', modulesYaml)
  const accountRecord = new Record(accountModule)
  accountRecord.recordID = recordID
  accountRecord.values = {
    AccountName: 'John'
  }

  describe('successful setting of account values', () => {
    it('should sucessfully set values of an account', async () => {
      const record = await SetValues.exec({ $record: accountRecord })
      expect(record.values.AccountSelect).equal('John')
    })
  })
})
