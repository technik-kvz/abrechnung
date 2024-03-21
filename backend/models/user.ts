import { Document, HydratedDocument, Model, Query, Schema, model } from 'mongoose'
import { Access, Token, User, accesses } from '../../common/types.js'

const accessObject: { [key in Access]?: any } = {}
for (const access of accesses) {
  accessObject[access] = { type: Boolean, default: false }
}

interface Methods {
  isActive(): Promise<boolean>
}

type UserModel = Model<User, {}, Methods>

const userSchema = new Schema<User, UserModel, Methods>({
  fk: {
    microsoft: { type: String, index: true, unique: true, sparse: true },
    ldapauth: { type: String, index: true, unique: true, sparse: true },
    magiclogin: { type: String, index: true, unique: true, sparse: true }
  },
  email: { type: String, unique: true, index: true, required: true },
  name: { givenName: { type: String, trim: true, required: true }, familyName: { type: String, trim: true, required: true } },
  access: accessObject,
  loseAccessAt: { type: Date },
  settings: {
    language: { type: String, default: 'de' },
    lastCurrencies: [{ type: String, ref: 'Currency' }],
    lastCountries: [{ type: String, ref: 'Country' }],
    lastProjects: [{ type: String, ref: 'Project' }],
    insurance: { type: Schema.Types.ObjectId, ref: 'HealthInsurance' },
    project: { type: Schema.Types.ObjectId, ref: 'Project' }
  },
  vehicleRegistration: [{ type: Schema.Types.ObjectId, ref: 'DocumentFile' }],
  token: { type: Schema.Types.ObjectId, ref: 'Token' }
})

function populate(doc: Document) {
  return Promise.allSettled([
    doc.populate({ path: 'settings.insurance' }),
    doc.populate({ path: 'settings.project', select: { name: 1, organisation: 1 } }),
    doc.populate({ path: 'settings.lastCurrencies' }),
    doc.populate({ path: 'settings.lastCountries', select: { name: 1, flag: 1, currency: 1 } }),
    doc.populate({ path: 'settings.lastProjects', select: { name: 1, organisation: 1 } }),
    doc.populate({ path: 'vehicleRegistration', select: { name: 1, type: 1 } }),
    doc.populate<{ token: Token }>({ path: 'token', populate: { path: 'files', select: { name: 1, type: 1 } } })
  ])
}

userSchema.pre(/^find((?!Update).)*$/, function () {
  const projection = (this as Query<User, User>).projection()
  const popInProj: boolean = projection && (projection.settings || projection.vehicleRegistration || projection.token)
  if ((this as Query<User, User>).selectedExclusively() && popInProj) {
    return
  }
  if ((this as Query<User, User>).selectedInclusively() && !popInProj) {
    return
  }
  populate(this as Document)
})

userSchema.pre('save', async function (next) {
  await populate(this)
  next()
})

userSchema.methods.isActive = async function (this: UserDoc) {
  if (this.access.user) {
    if (!(this.loseAccessAt && (this.loseAccessAt as Date).valueOf() <= new Date().valueOf())) {
      return true
    } else {
      for (const access of accesses) {
        this.access[access] = false
      }
      await this.save()
    }
  }
  return false
}

export default model<User>('User', userSchema)

export interface UserDoc extends Methods, HydratedDocument<User> {}
