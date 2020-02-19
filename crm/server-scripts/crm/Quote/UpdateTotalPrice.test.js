import path from 'path'
import { describe, it } from 'mocha'
import { expect } from 'chai'
import { compose } from '@cortezaproject/corteza-js'
import UpdateTotalPrice from './UpdateTotalPrice'
const { Record, getModuleFromYaml } = compose

describe(__filename, () => {
  const modulesYaml = path.join(__dirname, '../../../', 'config', '1100_modules.yaml')
  const recordID = '1'

  const solutionModule = getModuleFromYaml('Solution', modulesYaml)
  const solutionRecord = new Record(solutionModule)
  solutionRecord.recordID = recordID
  solutionRecord.values = {
    Subtotal: 1,
    Discount: 1,
    ShippingHandling: 1,
    TotalPrice: 1,
    Tax: 1,
    GrandTotal: 1
  }

  describe('successful update of total price', () => {
    it('should sucessfully update total price of solution', async () => {
      const record = await UpdateTotalPrice.exec({ $record: solutionRecord })
      let totalPrice = solutionRecord.values.Subtotal - solutionRecord.values.Discount
      totalPrice = totalPrice + solutionRecord.values.ShippingHandling

      const grandTotal = totalPrice * (1 + solutionRecord.values.Tax / 100)
      expect(record.values.TotalPrice).equal(totalPrice)
      expect(record.values.GrandTotal).equal(grandTotal)
    })
  })
})
