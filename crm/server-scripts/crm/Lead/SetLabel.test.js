import path from 'path'
import { describe, it } from 'mocha'
import { expect } from 'chai'
import { compose } from '@cortezaproject/corteza-js'
import SetLabel from './SetLabel'
const { Record, getModuleFromYaml } = compose

describe(__filename, () => {
  const modulesYaml = path.join(__dirname, '../../../', 'config', '1100_modules.yaml')
  const recordID = '1'

  const leadModule = getModuleFromYaml('Lead', modulesYaml)
  const leadRecord = new Record(leadModule)
  leadRecord.recordID = recordID
  leadRecord.values = {
    AccountId: '1',
    FirstName: 'John',
    LastName: 'Doe',
    Company: 'Company'
  }

  describe('successful setting of lead values', () => {
    it('should sucessfully set record label of a lead', async () => {
      const record = await SetLabel.exec({ $record: leadRecord })
      expect(record.values.RecordLabel).equal('John Doe (Company)')
    })
  })
})
