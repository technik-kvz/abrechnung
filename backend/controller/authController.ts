import { Body, Controller, Post, Route, SuccessResponse, Response, Get, Query, Tags, Middlewares, Request, Delete, Security } from 'tsoa'
import User, { UserDoc } from '../models/user.js'
import { Request as ExRequest, Response as ExResponse, NextFunction } from 'express'
import passport from 'passport'
import magiclogin from '../authStrategies/magiclogin.js'

const disabledMessage = 'This Authentication Method has been disabled by .env settings.'
const useLDAPauth = process.env.VITE_AUTH_USE_LDAP.toLocaleLowerCase() === 'true'
const useMicrosoft = process.env.VITE_AUTH_USE_MS_AZURE.toLocaleLowerCase() === 'true'
const useMagicLogin = process.env.VITE_AUTH_USE_MAGIC_LOGIN.toLocaleLowerCase() === 'true'

const NotImplementedMiddleware = (req: ExRequest, res: ExResponse, next: NextFunction) => {
  res.status(501).send(disabledMessage)
}

const ldapauthHandler = useLDAPauth ? passport.authenticate('ldapauth', { session: true }) : NotImplementedMiddleware

const microsoftHandler = useMicrosoft
  ? (req: ExRequest, res: ExResponse, next: NextFunction) => {
      const redirect = req.query.redirect
      const state = req.query.redirect ? Buffer.from(JSON.stringify({ redirect })).toString('base64') : undefined
      passport.authenticate('microsoft', { state: state })(req, res, next)
    }
  : NotImplementedMiddleware

const microsoftCallbackHandler = useMicrosoft ? (req: ExRequest, res: ExResponse, next: NextFunction) => {} : NotImplementedMiddleware

const magicloginHandler = useMagicLogin
  ? async (req: ExRequest, res: ExResponse, next: NextFunction) => {
      var user = await User.findOne({ 'fk.magiclogin': req.body.destination })
      if (user && (await (user as UserDoc).isActive())) {
        magiclogin.send(req, res)
      } else {
        throw new Error('No magiclogin user found for e-mail: ' + req.body.destination)
      }
    }
  : NotImplementedMiddleware

const magicloginCallbackHandler = useMagicLogin ? passport.authenticate('magiclogin') : NotImplementedMiddleware

@Tags('Authentication')
@Route('auth')
@Response(501, disabledMessage)
export class AuthController extends Controller {
  /**
   * Provides the authentication cookie.
   * @summary Login using LDAP
   */
  @Post('ldapauth')
  @Middlewares(ldapauthHandler)
  public ldapauth(@Body() requestBody: { username: string; password: string }) {}

  /**
   * @summary Redirecting to Microsoft login
   */
  @Get('microsoft')
  @Middlewares(microsoftHandler)
  @SuccessResponse(302, 'Redirecting to Microsoft')
  public microsoft(@Query() redirect?: string) {}

  /**
   * Provides the authentication cookie.
   * @summary Microsoft login endpoint
   */
  @Get('microsoft/callback')
  @Middlewares(microsoftHandler)
  @SuccessResponse(302, 'Redirecting to Frontend')
  public microsoftCallback(@Query() state?: string) {
    var redirect: string | undefined
    if (state) {
      try {
        redirect = JSON.parse(Buffer.from(state, 'base64').toString()).redirect
      } catch {}
    }
    this.redirectToFrontend(redirect)
  }

  /**
   * Send a magiclogin email to the destination email address.
   * @summary Send login email
   */
  @Post('magiclogin')
  @Middlewares(magicloginHandler)
  @SuccessResponse(200)
  public magiclogin(@Body() requestBody: { destination: string; redirect?: string }) {}

  /**
   * Provides the authentication cookie.
   * @summary Email login endpoint
   */
  @Get('magiclogin/callback')
  @Middlewares(magicloginCallbackHandler)
  @SuccessResponse(302, 'Redirecting to Frontend')
  public magicloginCallback(@Query() token: string, @Request() req: ExRequest) {
    this.redirectToFrontend(req.authInfo?.redirect)
  }

  private redirectToFrontend(path?: string) {
    var redirect = ''
    if (path && path.startsWith('/')) {
      redirect = path
    }
    this.setHeader('Location', process.env.VITE_FRONTEND_URL + redirect)
    this.setStatus(302)
  }
}

@Tags('Authentication')
@Security('cookieAuth')
@Route('auth')
export class logoutController extends Controller {
  /**
   * Logout and delete session
   * @summary Logout
   */
  @Delete('logout')
  public logout(@Request() request: ExRequest) {
    request.logout((err) => {
      if (err) {
        throw new Error(err)
      }
    })
  }
  /**
   * Empty method
   * @summary Check if request is authenticated
   */
  @Get('authenticated')
  public authenticated(): void {}
}
