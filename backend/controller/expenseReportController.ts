import { Request as ExRequest } from 'express'
import multer from 'multer'
import { Body, Delete, Get, Middlewares, Post, Produces, Queries, Query, Request, Route, Security, Tags } from 'tsoa'
import { Expense, ExpenseReportState, ExpenseReport as IExpenseReport, Locale, _id } from '../../common/types.js'
import { documentFileHandler, writeToDisk } from '../helper.js'
import i18n from '../i18n.js'
import { sendNotificationMail } from '../mail/mail.js'
import ExpenseReport, { ExpenseReportDoc } from '../models/expenseReport.js'
import User from '../models/user.js'
import { generateExpenseReportReport } from '../pdf/expenseReport.js'
import { writeToDiskFilePath } from '../pdf/helper.js'
import { Controller, GetterQuery, SetterBody } from './controller.js'
import { AuthorizationError, NotFoundError } from './error.js'
import { IdDocument, MoneyPost } from './types.js'

const fileHandler = multer({ limits: { fileSize: 16000000 } })

@Tags('ExpenseReport')
@Route('expenseReport')
@Security('cookieAuth', ['user'])
export class ExpenseReportController extends Controller {
  @Get()
  public async getExpenseReport(@Queries() query: GetterQuery<IExpenseReport>, @Request() request: ExRequest) {
    const sortFn = (a: IExpenseReport, b: IExpenseReport) => (a.createdAt as Date).valueOf() - (b.createdAt as Date).valueOf()
    return await this.getter(ExpenseReport, {
      query,
      filter: { owner: request.user!._id, historic: false },
      projection: { history: 0, historic: 0, expenses: 0 },
      allowedAdditionalFields: ['expenses'],
      sortFn
    })
  }
  @Delete()
  public async deleteExpenseReport(@Query() _id: _id, @Request() request: ExRequest) {
    return await this.deleter(ExpenseReport, { _id: _id, checkOldObject: this.checkOwner(request.user!) })
  }

  @Post('expense')
  @Middlewares(fileHandler.any())
  public async postExpense(@Query('parentId') parentId: _id, @Body() requestBody: SetterBody<Expense>, @Request() request: ExRequest) {
    return await this.setterForArrayElement(ExpenseReport, {
      requestBody,
      parentId,
      arrayElementKey: 'expenses',
      allowNew: true,
      async checkOldObject(oldObject) {
        if (!oldObject.historic && oldObject.state === 'inWork' && request.user!._id.equals(oldObject.owner._id)) {
          await documentFileHandler(['cost', 'receipts'])(request)
          return true
        } else {
          return false
        }
      },
      sortFn: (a: Expense, b) => new Date(a.cost.date).valueOf() - new Date(b.cost.date).valueOf()
    })
  }

  @Delete('expense')
  public async deleteExpenese(@Query() _id: _id, @Query() parentId: _id, @Request() request: ExRequest) {
    return await this.deleterForArrayElement(ExpenseReport, {
      _id,
      parentId,
      arrayElementKey: 'expenses',
      async checkOldObject(oldObject) {
        if (!oldObject.historic && oldObject.state === 'inWork' && request.user!._id.equals(oldObject.owner._id)) {
          return true
        } else {
          return false
        }
      }
    })
  }

  @Post('inWork')
  public async postInWork(
    @Body() requestBody: { project?: IdDocument; _id?: _id; name?: string; advance: MoneyPost | undefined },
    @Request() request: ExRequest
  ) {
    const extendedBody = Object.assign(requestBody, {
      state: 'inWork' as ExpenseReportState,
      owner: request.user?._id,
      editor: request.user?._id
    })

    if (!extendedBody._id) {
      if (!request.user!.access['inWork:expenseReport']) {
        throw new AuthorizationError()
      } else if (!extendedBody.name) {
        var date = new Date()
        extendedBody.name =
          i18n.t('labels.expenses', { lng: request.user!.settings.language }) +
          ' ' +
          i18n.t('monthsShort.' + date.getUTCMonth(), { lng: request.user!.settings.language }) +
          ' ' +
          date.getUTCFullYear()
      }
    }
    return await this.setter(ExpenseReport, {
      requestBody: extendedBody,
      async checkOldObject(oldObject: ExpenseReportDoc) {
        if (
          (oldObject.owner._id.equals(request.user!._id) && oldObject.state === 'inWork' && request.user!.access['inWork:expenseReport']) ||
          (oldObject.state === 'underExamination' && oldObject.editor._id.equals(request.user!._id))
        ) {
          await oldObject.saveToHistory()
          await oldObject.save()
          return true
        } else {
          return false
        }
      },
      allowNew: true
    })
  }

  @Post('underExamination')
  public async postUnderExamination(@Body() requestBody: { _id: _id; comment?: string }, @Request() request: ExRequest) {
    const extendedBody = Object.assign(requestBody, { state: 'underExamination' as ExpenseReportState, editor: request.user?._id })

    return await this.setter(ExpenseReport, {
      requestBody: extendedBody,
      cb: sendNotificationMail,
      allowNew: false,
      async checkOldObject(oldObject: ExpenseReportDoc) {
        if (oldObject.owner._id.equals(request.user!._id) && oldObject.state === 'inWork') {
          await oldObject.saveToHistory()
          await oldObject.save()
          return true
        } else {
          return false
        }
      }
    })
  }

  @Get('report')
  @Produces('application/pdf')
  public async getReport(@Query() _id: _id, @Request() request: ExRequest) {
    const expenseReport = await ExpenseReport.findOne({
      _id: _id,
      owner: request.user!._id,
      historic: false,
      state: 'refunded'
    }).lean()
    if (expenseReport) {
      const report = await generateExpenseReportReport(expenseReport, request.user!.settings.language)
      request.res?.setHeader('Content-disposition', 'attachment; filename=' + expenseReport.name + '.pdf')
      request.res?.setHeader('Content-Type', 'application/pdf')
      request.res?.setHeader('Content-Length', report.length)
      request.res?.send(Buffer.from(report))
    } else {
      throw new NotFoundError(`No expense report found or not allowed`)
    }
  }

  @Get('examiner')
  public async getExaminer() {
    return await this.getter(User, {
      query: { limit: 5 },
      filter: { 'access.examine/expenseReport': true },
      projection: { name: 1, email: 1 }
    })
  }
}

@Tags('Examine', 'ExpenseReport')
@Route('examine/expenseReport')
@Security('cookieAuth', ['examine/expenseReport'])
export class ExpenseReportExamineController extends Controller {
  @Get()
  public async getExpenseReport(@Queries() query: GetterQuery<IExpenseReport>) {
    const sortFn = (a: IExpenseReport, b: IExpenseReport) => (a.updatedAt as Date).valueOf() - (b.updatedAt as Date).valueOf()
    return await this.getter(ExpenseReport, {
      query,
      filter: { $and: [{ historic: false }, { $or: [{ state: 'underExamination' }, { state: 'refunded' }] }] },
      projection: { history: 0, historic: 0, expenses: 0 },
      allowedAdditionalFields: ['expenses'],
      sortFn
    })
  }

  @Delete()
  public async deleteExpenseReport(@Query() _id: _id) {
    return await this.deleter(ExpenseReport, { _id: _id })
  }

  @Post('expense')
  @Middlewares(fileHandler.any())
  public async postExpense(@Query('parentId') parentId: _id, @Body() requestBody: SetterBody<Expense>, @Request() request: ExRequest) {
    return await this.setterForArrayElement(ExpenseReport, {
      requestBody,
      parentId,
      arrayElementKey: 'expenses',
      allowNew: true,
      async checkOldObject(oldObject) {
        if (!oldObject.historic && oldObject.state === 'underExamination') {
          await documentFileHandler(['cost', 'receipts'], { owner: oldObject.owner._id })(request)
          return true
        } else {
          return false
        }
      },
      sortFn: (a: Expense, b) => new Date(a.cost.date).valueOf() - new Date(b.cost.date).valueOf()
    })
  }

  @Delete('expense')
  public async deleteExpenese(@Query() _id: _id, @Query() parentId: _id) {
    return await this.deleterForArrayElement(ExpenseReport, {
      _id,
      parentId,
      arrayElementKey: 'expenses',
      async checkOldObject(oldObject) {
        if (!oldObject.historic && oldObject.state === 'underExamination') {
          return true
        } else {
          return false
        }
      }
    })
  }

  @Post('inWork')
  public async postBackInWork(
    @Body()
    requestBody: { project?: IdDocument; _id?: _id; name?: string; advance: MoneyPost | undefined; owner?: IdDocument; comment?: string },
    @Request() request: ExRequest
  ) {
    const extendedBody = Object.assign(requestBody, { state: 'inWork' as ExpenseReportState, editor: request.user?._id })
    if (!extendedBody._id && !extendedBody.name) {
      var date = new Date()
      extendedBody.name =
        i18n.t('labels.expenses', { lng: request.user!.settings.language }) +
        ' ' +
        i18n.t('monthsShort.' + date.getUTCMonth(), { lng: request.user!.settings.language }) +
        ' ' +
        date.getUTCFullYear()
    }
    return await this.setter(ExpenseReport, {
      requestBody: extendedBody,
      cb: (e: IExpenseReport) => sendNotificationMail(e, extendedBody._id ? 'backToInWork' : undefined),
      allowNew: true,
      async checkOldObject(oldObject: ExpenseReportDoc) {
        if (oldObject.state === 'underExamination') {
          await oldObject.saveToHistory()
          await oldObject.save()
          return true
        } else {
          return false
        }
      }
    })
  }

  @Post('refunded')
  public async postRefunded(@Body() requestBody: { _id: _id; comment?: string }, @Request() request: ExRequest) {
    const extendedBody = Object.assign(requestBody, { state: 'refunded' as ExpenseReportState, editor: request.user?._id })

    const cb = async (expenseReport: IExpenseReport) => {
      sendNotificationMail(expenseReport)
      if (process.env.BACKEND_SAVE_REPORTS_ON_DISK.toLowerCase() === 'true') {
        await writeToDisk(
          await writeToDiskFilePath(expenseReport),
          await generateExpenseReportReport(expenseReport, i18n.language as Locale)
        )
      }
    }

    return await this.setter(ExpenseReport, {
      requestBody: extendedBody,
      cb,
      allowNew: false,
      async checkOldObject(oldObject: ExpenseReportDoc) {
        if (oldObject.state === 'underExamination') {
          await oldObject.saveToHistory()
          await oldObject.save()
          return true
        } else {
          return false
        }
      }
    })
  }

  @Get('report')
  @Produces('application/pdf')
  public async getReport(@Query() _id: _id, @Request() request: ExRequest) {
    const expenseReport = await ExpenseReport.findOne({ _id, historic: false, state: 'refunded' }).lean()
    if (expenseReport) {
      const report = await generateExpenseReportReport(expenseReport, request.user!.settings.language)
      request.res?.setHeader('Content-disposition', 'attachment; filename=' + expenseReport.name + '.pdf')
      request.res?.setHeader('Content-Type', 'application/pdf')
      request.res?.setHeader('Content-Length', report.length)
      request.res?.send(Buffer.from(report))
    } else {
      throw new NotFoundError(`No expense report found or unauthorized`)
    }
  }
}
