<template>
  <div class="main">
    <div class="auth-card">
      <!-- OAuth Token Handler (invisible) -->
      <div v-if="oauthProcessing" class="oauth-processing">
        <a-spin size="large" />
        <p>{{ $t('user.oauth.processing') || 'Processing login...' }}</p>
      </div>

      <!-- Main Content -->
      <div v-show="!oauthProcessing">
        <!-- Tabs: Login / Register -->
        <a-tabs v-model="activeTab" :animated="false">
          <!-- Login Tab -->
          <a-tab-pane key="login" :tab="$t('user.login.tab') || 'Login'">
            <!-- Login Method Switch -->
            <div class="login-method-switch">
              <a
                :class="{ active: loginMethod === 'password' }"
                @click="loginMethod = 'password'"
              >{{ $t('user.login.methodPassword') || 'Password' }}</a>
              <a-divider type="vertical" />
              <a
                :class="{ active: loginMethod === 'code' }"
                @click="loginMethod = 'code'"
              >{{ $t('user.login.methodCode') || 'Email Code' }}</a>
            </div>

            <!-- Password Login Form -->
            <a-form
              v-show="loginMethod === 'password'"
              id="formLogin"
              class="auth-form"
              ref="formLogin"
              :form="loginForm"
              @submit="handleLogin"
            >
              <a-alert v-if="loginError" type="error" showIcon style="margin-bottom: 24px;" :message="loginError" />
              <a-alert v-if="oauthError" type="error" showIcon style="margin-bottom: 24px;" :message="oauthError" />

              <a-form-item>
                <a-input
                  size="large"
                  type="text"
                  :placeholder="$t('user.login.username') || 'Username'"
                  v-decorator="[
                    'username',
                    {rules: [{ required: true, message: $t('user.login.usernameRequired') || 'Please enter username' }], validateTrigger: 'blur'}
                  ]"
                >
                  <a-icon slot="prefix" type="user" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                </a-input>
              </a-form-item>

              <a-form-item>
                <a-input-password
                  size="large"
                  :placeholder="$t('user.login.password') || 'Password'"
                  v-decorator="[
                    'password',
                    {rules: [{ required: true, message: $t('user.login.passwordRequired') || 'Please enter password' }], validateTrigger: 'blur'}
                  ]"
                >
                  <a-icon slot="prefix" type="lock" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                </a-input-password>
              </a-form-item>

              <a-form-item style="margin-top:24px">
                <a-button
                  size="large"
                  type="primary"
                  htmlType="submit"
                  class="submit-button"
                  :loading="loginLoading"
                  :disabled="loginLoading"
                  block
                >{{ $t('user.login.submit') || 'Login' }}</a-button>
              </a-form-item>

              <!-- Forgot Password Link -->
              <div class="auth-links">
                <a @click="showResetModal = true">{{ $t('user.login.forgotPassword') || 'Forgot Password?' }}</a>
              </div>
            </a-form>

            <!-- Email Code Login Form -->
            <a-form
              v-show="loginMethod === 'code'"
              id="formCodeLogin"
              class="auth-form"
              ref="formCodeLogin"
              :form="codeLoginForm"
              @submit="handleCodeLogin"
            >
              <a-alert v-if="codeLoginError" type="error" showIcon style="margin-bottom: 24px;" :message="codeLoginError" />
              <a-alert v-if="oauthError" type="error" showIcon style="margin-bottom: 24px;" :message="oauthError" />

              <a-form-item>
                <a-input
                  size="large"
                  type="email"
                  :placeholder="$t('user.login.email') || 'Email'"
                  v-decorator="[
                    'email',
                    {
                      rules: [
                        { required: true, message: $t('user.login.emailRequired') || 'Please enter email' },
                        { type: 'email', message: $t('user.login.emailInvalid') || 'Invalid email format' }
                      ],
                      validateTrigger: 'blur'
                    }
                  ]"
                >
                  <a-icon slot="prefix" type="mail" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                </a-input>
              </a-form-item>

              <a-form-item>
                <a-row class="auth-code-row" :gutter="12">
                  <a-col :span="16">
                    <a-input
                      size="large"
                      :placeholder="$t('user.login.verificationCode') || 'Verification Code'"
                      v-decorator="[
                        'code',
                        {
                          rules: [{ required: true, message: $t('user.login.codeRequired') || 'Please enter verification code' }],
                          validateTrigger: 'blur'
                        }
                      ]"
                    >
                      <a-icon slot="prefix" type="safety-certificate" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                    </a-input>
                  </a-col>
                  <a-col :span="8">
                    <a-button
                      size="large"
                      block
                      :loading="codeLoginSendingCode"
                      :disabled="codeLoginSendingCode || codeLoginCountdown > 0"
                      @click="handleCodeLoginSendCode"
                    >
                      {{ codeLoginCountdown > 0 ? `${codeLoginCountdown}s` : ($t('user.login.sendCode') || 'Send') }}
                    </a-button>
                  </a-col>
                </a-row>
              </a-form-item>

              <a-form-item style="margin-top:24px">
                <a-button
                  size="large"
                  type="primary"
                  htmlType="submit"
                  class="submit-button"
                  :loading="codeLoginLoading"
                  :disabled="codeLoginLoading"
                  block
                >{{ $t('user.login.submit') || 'Login' }}</a-button>
              </a-form-item>

              <div class="code-login-hint">
                <a-icon type="info-circle" />
                <span>{{ $t('user.login.codeLoginHint') || 'New users will be automatically registered' }}</span>
              </div>
            </a-form>

            <!-- OAuth Login -->
            <div v-if="hasOAuth" class="oauth-section">
              <a-divider>{{ $t('user.login.orLoginWith') || 'Or login with' }}</a-divider>
              <div class="oauth-buttons">
                <a-button
                  v-if="securityConfig.oauth_google_enabled"
                  class="oauth-btn google-btn"
                  @click="handleGoogleLogin"
                >
                  <svg class="oauth-icon" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </a-button>
                <a-button
                  v-if="securityConfig.oauth_github_enabled"
                  class="oauth-btn github-btn"
                  @click="handleGitHubLogin"
                >
                  <a-icon type="github" />
                  GitHub
                </a-button>
              </div>
            </div>
          </a-tab-pane>

          <!-- Register Tab -->
          <a-tab-pane v-if="securityConfig.registration_enabled" key="register" :tab="$t('user.register.tab') || 'Register'">
            <a-form
              id="formRegister"
              class="auth-form"
              ref="formRegister"
              :form="registerForm"
              @submit="handleRegister"
            >
              <a-alert v-if="registerError" type="error" showIcon style="margin-bottom: 24px;" :message="registerError" />

              <!-- Email -->
              <a-form-item>
                <a-input
                  size="large"
                  type="email"
                  :placeholder="$t('user.register.email') || 'Email'"
                  v-decorator="[
                    'email',
                    {
                      rules: [
                        { required: true, message: $t('user.register.emailRequired') || 'Please enter email' },
                        { type: 'email', message: $t('user.register.emailInvalid') || 'Invalid email format' }
                      ],
                      validateTrigger: 'blur'
                    }
                  ]"
                >
                  <a-icon slot="prefix" type="mail" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                </a-input>
              </a-form-item>

              <!-- Verification Code -->
              <a-form-item>
                <a-row class="auth-code-row" :gutter="12">
                  <a-col :span="16">
                    <a-input
                      size="large"
                      :placeholder="$t('user.register.verificationCode') || 'Verification Code'"
                      v-decorator="[
                        'code',
                        {
                          rules: [{ required: true, message: $t('user.register.codeRequired') || 'Please enter verification code' }],
                          validateTrigger: 'blur'
                        }
                      ]"
                    >
                      <a-icon slot="prefix" type="safety-certificate" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                    </a-input>
                  </a-col>
                  <a-col :span="8">
                    <a-button
                      size="large"
                      block
                      :loading="registerSendingCode"
                      :disabled="registerSendingCode || registerCountdown > 0"
                      @click="handleRegisterSendCode"
                    >
                      {{ registerCountdown > 0 ? `${registerCountdown}s` : ($t('user.register.sendCode') || 'Send') }}
                    </a-button>
                  </a-col>
                </a-row>
              </a-form-item>

              <!-- Username -->
              <a-form-item>
                <a-input
                  size="large"
                  :placeholder="$t('user.register.username') || 'Username'"
                  v-decorator="[
                    'username',
                    {
                      rules: [
                        { required: true, message: $t('user.register.usernameRequired') || 'Please enter username' },
                        { min: 3, max: 30, message: $t('user.register.usernameLength') || 'Username must be 3-30 characters' },
                        { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: $t('user.register.usernamePattern') || 'Start with letter, letters/numbers/underscore only' }
                      ],
                      validateTrigger: 'blur'
                    }
                  ]"
                >
                  <a-icon slot="prefix" type="user" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                </a-input>
              </a-form-item>

              <!-- Password with requirements popover -->
              <a-form-item>
                <a-popover
                  placement="rightTop"
                  :trigger="['focus']"
                  :visible="regPwdFocused && !regPwdValid"
                >
                  <template slot="content">
                    <div class="password-requirements">
                      <div :class="{ valid: regHasMinLength }">
                        <a-icon :type="regHasMinLength ? 'check-circle' : 'close-circle'" />
                        {{ $t('user.register.pwdMinLength') || 'At least 8 characters' }}
                      </div>
                      <div :class="{ valid: regHasUppercase }">
                        <a-icon :type="regHasUppercase ? 'check-circle' : 'close-circle'" />
                        {{ $t('user.register.pwdUppercase') || 'At least one uppercase letter' }}
                      </div>
                      <div :class="{ valid: regHasLowercase }">
                        <a-icon :type="regHasLowercase ? 'check-circle' : 'close-circle'" />
                        {{ $t('user.register.pwdLowercase') || 'At least one lowercase letter' }}
                      </div>
                      <div :class="{ valid: regHasNumber }">
                        <a-icon :type="regHasNumber ? 'check-circle' : 'close-circle'" />
                        {{ $t('user.register.pwdNumber') || 'At least one number' }}
                      </div>
                    </div>
                  </template>
                  <a-input-password
                    size="large"
                    :placeholder="$t('user.register.password') || 'Password'"
                    @focus="regPwdFocused = true"
                    @blur="regPwdFocused = false"
                    @change="checkRegPassword"
                    v-decorator="[
                      'password',
                      {
                        rules: [
                          { required: true, message: $t('user.register.passwordRequired') || 'Please enter password' },
                          { validator: validateRegPassword }
                        ],
                        validateTrigger: 'blur'
                      }
                    ]"
                  >
                    <a-icon slot="prefix" type="lock" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                  </a-input-password>
                </a-popover>
              </a-form-item>

              <!-- Confirm Password -->
              <a-form-item>
                <a-input-password
                  size="large"
                  :placeholder="$t('user.register.confirmPassword') || 'Confirm Password'"
                  v-decorator="[
                    'confirmPassword',
                    {
                      rules: [
                        { required: true, message: $t('user.register.confirmPasswordRequired') || 'Please confirm password' },
                        { validator: validateRegConfirmPassword }
                      ],
                      validateTrigger: 'blur'
                    }
                  ]"
                >
                  <a-icon slot="prefix" type="lock" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                </a-input-password>
              </a-form-item>

              <a-form-item style="margin-top:24px">
                <a-button
                  size="large"
                  type="primary"
                  htmlType="submit"
                  class="submit-button"
                  :loading="registerLoading"
                  :disabled="registerLoading"
                  block
                >{{ $t('user.register.submit') || 'Create Account' }}</a-button>
              </a-form-item>
            </a-form>
          </a-tab-pane>
        </a-tabs>

        <!-- Legal Agreement -->
        <div class="legal-wrap">
          <div class="legal-agree">
            <a-checkbox v-model="legalAgreed">
              <span>{{ $t('user.login.legal.agreePrefix') }}</span>
              <a class="policy-link" @click.stop.prevent="legalModalVisible = true">
                {{ $t('user.login.legal.title') }}
              </a>
              <span>{{ $t('user.login.legal.and') }}</span>
              <a class="policy-link" @click.stop.prevent="privacyModalVisible = true">
                {{ $t('user.login.privacy.title') }}
              </a>
            </a-checkbox>
            <div v-if="legalError" class="legal-error">{{ $t('user.login.legal.required') }}</div>
          </div>
        </div>
      </div>
    </div>

    <a-modal
      v-model="legalModalVisible"
      :footer="null"
      :width="620"
      :bodyStyle="{ '--login-accent': themeAccent }"
      wrapClassName="policy-modal-wrap"
      centered
    >
      <template slot="title">
        <span class="policy-modal-title" :style="{ '--login-accent': themeAccent }">
          <a-icon type="file-protect" />
          <span>{{ $t('user.login.legal.title') }}</span>
        </span>
      </template>
      <div class="policy-modal-content">
        <p>{{ $t('user.login.legal.content') }}</p>
      </div>
      <div class="policy-modal-actions">
        <a-button type="primary" @click="legalModalVisible = false">
          {{ $t('common.close') }}
        </a-button>
      </div>
    </a-modal>

    <a-modal
      v-model="privacyModalVisible"
      :footer="null"
      :width="620"
      :bodyStyle="{ '--login-accent': themeAccent }"
      wrapClassName="policy-modal-wrap"
      centered
    >
      <template slot="title">
        <span class="policy-modal-title" :style="{ '--login-accent': themeAccent }">
          <a-icon type="safety-certificate" />
          <span>{{ $t('user.login.privacy.title') }}</span>
        </span>
      </template>
      <div class="policy-modal-content">
        <p>{{ privacyPolicyContent }}</p>
      </div>
      <div class="policy-modal-actions">
        <a-button type="primary" @click="privacyModalVisible = false">
          {{ $t('common.close') }}
        </a-button>
      </div>
    </a-modal>

    <!-- MFA Login Modal -->
    <a-modal
      v-model="mfaLoginVisible"
      :title="$t('user.login.mfa.title') || 'Two-step verification'"
      :confirmLoading="mfaLoginLoading"
      :okText="$t('user.login.mfa.verify') || 'Verify'"
      :cancelText="$t('common.cancel') || 'Cancel'"
      :destroyOnClose="true"
      @ok="handleMfaLoginVerify"
      @cancel="resetMfaLogin"
    >
      <div class="mfa-login-panel">
        <a-alert
          type="info"
          showIcon
          :message="$t('user.login.mfa.hint') || 'Open your authenticator app and enter the 6-digit code for this account.'"
          style="margin-bottom: 16px"
        />
        <a-input
          v-model="mfaLoginCode"
          size="large"
          :maxLength="16"
          autocomplete="one-time-code"
          :placeholder="$t('user.login.mfa.placeholder') || '6-digit code'"
          @pressEnter="handleMfaLoginVerify"
        >
          <a-icon slot="prefix" type="safety-certificate" />
        </a-input>
        <div v-if="mfaLoginError" class="mfa-login-error">{{ mfaLoginError }}</div>
      </div>
    </a-modal>

    <!-- Reset Password Modal -->
    <a-modal
      v-model="showResetModal"
      :footer="null"
      :width="460"
      :destroyOnClose="true"
      :bodyStyle="{ '--login-accent': themeAccent }"
      wrapClassName="reset-password-modal-wrap"
      centered
      @cancel="resetResetModal"
    >
      <template slot="title">
        <span class="reset-modal-title" :style="{ '--login-accent': themeAccent }">
          <a-icon type="key" />
          <span class="reset-modal-heading">
            <strong>{{ $t('user.resetPassword.title') }}</strong>
            <small>{{ resetModalSubtitle }}</small>
          </span>
        </span>
      </template>

      <div v-if="resetStep < 3" class="reset-stepper">
        <div :class="['reset-step', { active: resetStep === 1, done: resetStep > 1 }]">
          <span>1</span>
          <strong>{{ $t('user.resetPassword.stepVerify') }}</strong>
        </div>
        <div :class="['reset-step-line', { active: resetStep > 1 }]"></div>
        <div :class="['reset-step', { active: resetStep === 2 }]">
          <span>2</span>
          <strong>{{ $t('user.resetPassword.stepSecure') }}</strong>
        </div>
      </div>

      <!-- Step 1: Email & Code -->
      <a-form
        v-if="resetStep === 1"
        class="auth-form"
        :form="resetForm"
        @submit="handleResetVerify"
      >
        <a-alert v-if="resetError" type="error" showIcon style="margin-bottom: 24px;" :message="resetError" />
        <p class="reset-step-copy">{{ $t('user.resetPassword.verifyHint') }}</p>

        <a-form-item>
          <a-input
            size="large"
            type="email"
            :placeholder="$t('user.resetPassword.email') || 'Email'"
            v-decorator="[
              'email',
              {
                rules: [
                  { required: true, message: $t('user.resetPassword.emailRequired') || 'Please enter email' },
                  { type: 'email', message: $t('user.resetPassword.emailInvalid') || 'Invalid email format' }
                ],
                validateTrigger: 'blur'
              }
            ]"
          >
            <a-icon slot="prefix" type="mail" :style="{ color: 'rgba(0,0,0,.25)' }"/>
          </a-input>
        </a-form-item>

        <a-form-item>
          <a-row class="auth-code-row" :gutter="12">
            <a-col :span="16">
              <a-input
                size="large"
                :placeholder="$t('user.resetPassword.verificationCode') || 'Verification Code'"
                v-decorator="[
                  'code',
                  {
                    rules: [{ required: true, message: $t('user.resetPassword.codeRequired') || 'Please enter verification code' }],
                    validateTrigger: 'blur'
                  }
                ]"
              >
                <a-icon slot="prefix" type="safety-certificate" :style="{ color: 'rgba(0,0,0,.25)' }"/>
              </a-input>
            </a-col>
            <a-col :span="8">
              <a-button
                size="large"
                block
                :loading="resetSendingCode"
                :disabled="resetSendingCode || resetCountdown > 0"
                @click="handleResetSendCode"
              >
                {{ resetCountdown > 0 ? `${resetCountdown}s` : ($t('user.resetPassword.sendCode') || 'Send') }}
              </a-button>
            </a-col>
          </a-row>
        </a-form-item>

        <a-form-item style="margin-top:24px">
          <a-button
            size="large"
            type="primary"
            htmlType="submit"
            class="submit-button"
            block
          >{{ $t('user.resetPassword.next') || 'Next' }}</a-button>
        </a-form-item>
      </a-form>

      <!-- Step 2: New Password -->
      <a-form
        v-if="resetStep === 2"
        class="auth-form"
        :form="resetPwdForm"
        @submit="handleResetPassword"
      >
        <a-alert v-if="resetError" type="error" showIcon style="margin-bottom: 24px;" :message="resetError" />

        <div class="email-display">
          <span>{{ $t('user.resetPassword.resettingFor') || 'Resetting for' }}:</span>
          <strong>{{ resetEmail }}</strong>
        </div>
        <p class="reset-step-copy">{{ $t('user.resetPassword.passwordHint') }}</p>

        <a-form-item>
          <a-popover
            placement="rightTop"
            :trigger="['focus']"
            :visible="resetPwdFocused && !resetPwdValid"
          >
            <template slot="content">
              <div class="password-requirements">
                <div :class="{ valid: resetHasMinLength }">
                  <a-icon :type="resetHasMinLength ? 'check-circle' : 'close-circle'" />
                  {{ $t('user.register.pwdMinLength') || 'At least 8 characters' }}
                </div>
                <div :class="{ valid: resetHasUppercase }">
                  <a-icon :type="resetHasUppercase ? 'check-circle' : 'close-circle'" />
                  {{ $t('user.register.pwdUppercase') || 'At least one uppercase letter' }}
                </div>
                <div :class="{ valid: resetHasLowercase }">
                  <a-icon :type="resetHasLowercase ? 'check-circle' : 'close-circle'" />
                  {{ $t('user.register.pwdLowercase') || 'At least one lowercase letter' }}
                </div>
                <div :class="{ valid: resetHasNumber }">
                  <a-icon :type="resetHasNumber ? 'check-circle' : 'close-circle'" />
                  {{ $t('user.register.pwdNumber') || 'At least one number' }}
                </div>
              </div>
            </template>
            <a-input-password
              size="large"
              :placeholder="$t('user.resetPassword.newPassword') || 'New Password'"
              @focus="resetPwdFocused = true"
              @blur="resetPwdFocused = false"
              @change="checkResetPassword"
              v-decorator="[
                'new_password',
                {
                  rules: [
                    { required: true, message: $t('user.resetPassword.passwordRequired') || 'Please enter new password' },
                    { validator: validateResetPassword }
                  ],
                  validateTrigger: 'blur'
                }
              ]"
            >
              <a-icon slot="prefix" type="lock" :style="{ color: 'rgba(0,0,0,.25)' }"/>
            </a-input-password>
          </a-popover>
        </a-form-item>

        <a-form-item>
          <a-input-password
            size="large"
            :placeholder="$t('user.resetPassword.confirmPassword') || 'Confirm Password'"
            v-decorator="[
              'confirm_password',
              {
                rules: [
                  { required: true, message: $t('user.resetPassword.confirmPasswordRequired') || 'Please confirm password' },
                  { validator: validateResetConfirmPassword }
                ],
                validateTrigger: 'blur'
              }
            ]"
          >
            <a-icon slot="prefix" type="lock" :style="{ color: 'rgba(0,0,0,.25)' }"/>
          </a-input-password>
        </a-form-item>

        <a-form-item style="margin-top:24px">
          <a-button
            size="large"
            type="primary"
            htmlType="submit"
            class="submit-button"
            :loading="resetLoading"
            block
          >{{ $t('user.resetPassword.submit') || 'Reset Password' }}</a-button>
        </a-form-item>

        <div class="auth-links">
          <a @click="resetStep = 1">
            <a-icon type="arrow-left" />
            {{ $t('user.resetPassword.back') || 'Back' }}
          </a>
        </div>
      </a-form>

      <!-- Step 3: Success -->
      <div v-if="resetStep === 3" class="success-panel">
        <a-result
          status="success"
          :title="$t('user.resetPassword.successTitle') || 'Password Reset Successful'"
          :sub-title="$t('user.resetPassword.successSubtitle') || 'You can now login with your new password'"
        >
          <template #extra>
            <a-button type="primary" @click="showResetModal = false; activeTab = 'login'">
              {{ $t('user.resetPassword.goToLogin') || 'Go to Login' }}
            </a-button>
          </template>
        </a-result>
      </div>
    </a-modal>

    <a-modal
      v-model="turnstileModalVisible"
      :footer="null"
      :maskClosable="false"
      :maskStyle="{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }"
      :width="420"
      class="turnstile-modal"
      wrapClassName="turnstile-modal-wrap"
      centered
      @cancel="cancelTurnstileChallenge"
    >
      <template slot="title">
        <span class="turnstile-modal-title">
          <a-icon type="safety-certificate" />
          <span>{{ $t('user.security.verifyTitle') }}</span>
        </span>
      </template>
      <div class="turnstile-modal-content">
        <p class="turnstile-modal-desc">
          {{ $t('user.security.verifyDesc') }}
        </p>
        <div class="turnstile-widget-shell">
          <Turnstile
            v-if="turnstileModalVisible"
            ref="authTurnstile"
            class="auth-turnstile"
            :siteKey="securityConfig.turnstile_site_key"
            :enabled="securityConfig.turnstile_enabled"
            appearance="always"
            execution="render"
            @error="handleSharedTurnstileError"
            @expired="resetSharedTurnstile"
          />
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { mapActions, mapState } from 'vuex'
import { timeFix } from '@/utils/util'
import { getSecurityConfig, issueTurnstileClearance, sendVerificationCode, register, resetPassword, loginWithCode, getGoogleOAuthUrl, getGitHubOAuthUrl, verifyLoginMfa } from '@/api/auth'
import Turnstile from '@/components/Turnstile/index.vue'
import storage from 'store'
import { ACCESS_TOKEN, USER_INFO, USER_ROLES } from '@/store/mutation-types'
import { promptChangeInitialPassword } from '@/utils/initialPasswordReminder'

export default {
  name: 'Login',
  components: {
    Turnstile
  },
  data () {
    return {
      activeTab: 'login',
      legalModalVisible: false,
      privacyModalVisible: false,
      legalAgreed: true,
      legalError: false,

      // Security config
      securityConfig: {
        turnstile_enabled: false,
        turnstile_site_key: '',
        registration_enabled: true,
        oauth_google_enabled: false,
        oauth_github_enabled: false
      },
      turnstileClearance: '',
      turnstileClearanceExpiresAt: 0,
      turnstileClearancePromise: null,
      turnstileModalVisible: false,

      // OAuth
      oauthProcessing: false,
      oauthError: null,

      // Referral code from URL
      referralCode: '',

      // Login Method
      loginMethod: 'password', // 'password' or 'code'

      // Password Login
      loginForm: this.$form.createForm(this, { name: 'loginForm' }),
      loginError: '',
      loginLoading: false,
      mfaLoginVisible: false,
      mfaLoginLoading: false,
      mfaLoginCode: '',
      mfaLoginError: '',
      mfaChallengeId: '',

      // Email Code Login
      codeLoginForm: this.$form.createForm(this, { name: 'codeLoginForm' }),
      codeLoginError: '',
      codeLoginLoading: false,
      codeLoginSendingCode: false,
      codeLoginCountdown: 0,
      codeLoginCountdownTimer: null,

      // Register
      registerForm: this.$form.createForm(this, { name: 'registerForm' }),
      registerError: '',
      registerLoading: false,
      registerSendingCode: false,
      registerCountdown: 0,
      registerCountdownTimer: null,
      regPwdFocused: false,
      regHasMinLength: false,
      regHasUppercase: false,
      regHasLowercase: false,
      regHasNumber: false,

      // Reset Password Modal
      showResetModal: false,
      resetStep: 1,
      resetForm: this.$form.createForm(this, { name: 'resetForm' }),
      resetPwdForm: this.$form.createForm(this, { name: 'resetPwdForm' }),
      resetError: '',
      resetLoading: false,
      resetSendingCode: false,
      resetCountdown: 0,
      resetCountdownTimer: null,
      resetEmail: '',
      resetCode: '',
      resetPwdFocused: false,
      resetHasMinLength: false,
      resetHasUppercase: false,
      resetHasLowercase: false,
      resetHasNumber: false
    }
  },
  computed: {
    ...mapState({
      brandConfig: state => state.brand.config,
      appColor: state => state.app.color
    }),
    themeAccent () {
      return this.appColor || '#faad14'
    },
    privacyPolicyContent () {
      const legal = this.brandConfig && this.brandConfig.legal
      return (legal && legal.privacy_policy_text) || this.$t('user.login.privacy.content')
    },
    resetModalSubtitle () {
      if (this.resetStep === 2) return this.$t('user.resetPassword.passwordHint')
      if (this.resetStep === 3) return this.$t('user.resetPassword.successSubtitle')
      return this.$t('user.resetPassword.verifyHint')
    },
    hasOAuth () {
      return this.securityConfig.oauth_google_enabled || this.securityConfig.oauth_github_enabled
    },
    regPwdValid () {
      return this.regHasMinLength && this.regHasUppercase && this.regHasLowercase && this.regHasNumber
    },
    resetPwdValid () {
      return this.resetHasMinLength && this.resetHasUppercase && this.resetHasLowercase && this.resetHasNumber
    }
  },
  created () {
    this.loadSecurityConfig()
    this.handleOAuthCallback()
    // Extract referral code after route is ready
    this.$nextTick(() => {
      this.extractReferralCode()
    })
  },
  watch: {
    '$route.query' () {
      // Re-extract referral code when route query changes
      this.extractReferralCode()
    }
  },
  beforeDestroy () {
    if (this.codeLoginCountdownTimer) clearInterval(this.codeLoginCountdownTimer)
    if (this.registerCountdownTimer) clearInterval(this.registerCountdownTimer)
    if (this.resetCountdownTimer) clearInterval(this.resetCountdownTimer)
  },
  methods: {
    ...mapActions(['Login', 'Logout']),

    hasValidTurnstileClearance () {
      return this.turnstileClearance && Date.now() < this.turnstileClearanceExpiresAt - 5000
    },

    async getTurnstileClearance () {
      if (!this.securityConfig.turnstile_enabled) {
        return undefined
      }
      if (this.hasValidTurnstileClearance()) {
        return this.turnstileClearance
      }
      if (this.turnstileClearancePromise) {
        return this.turnstileClearancePromise
      }
      this.turnstileModalVisible = true
      await this.$nextTick()
      const widget = this.$refs.authTurnstile
      if (!widget || typeof widget.execute !== 'function') {
        throw new Error(this.$t('user.security.verificationFailed'))
      }
      this.turnstileClearancePromise = widget.execute()
        .then(token => issueTurnstileClearance({ turnstile_token: token }))
        .then(res => {
          if (res.code !== 1 || !res.data?.turnstile_clearance) {
            throw new Error(this.$t('user.security.verificationFailed'))
          }
          this.turnstileClearance = res.data.turnstile_clearance
          const ttlMs = Math.max(30, Number(res.data.expires_in || 600)) * 1000
          this.turnstileClearanceExpiresAt = Date.now() + ttlMs
          this.turnstileModalVisible = false
          return this.turnstileClearance
        })
        .finally(() => {
          this.turnstileClearancePromise = null
        })
      return this.turnstileClearancePromise
    },

    resetSharedTurnstile () {
      this.turnstileClearance = ''
      this.turnstileClearanceExpiresAt = 0
      if (this.$refs.authTurnstile) {
        this.$refs.authTurnstile.reset()
      }
    },

    cancelTurnstileChallenge () {
      if (this.$refs.authTurnstile) {
        this.$refs.authTurnstile.reset()
      }
      this.turnstileModalVisible = false
    },

    handleSharedTurnstileError () {
      this.resetSharedTurnstile()
    },

    isTurnstileErrorMessage (message) {
      return /turnstile|clearance|verification/i.test(String(message || ''))
    },

    async loadSecurityConfig () {
      try {
        const res = await getSecurityConfig()
        if (res.code === 1 && res.data) {
          this.securityConfig = { ...this.securityConfig, ...res.data }
        }
      } catch (e) {
        console.error('Failed to load security config:', e)
      }
    },

    extractReferralCode () {
      // Extract referral code from URL: ?ref=123 or &ref=123
      // Support both regular query params and hash-based routing
      const urlParams = new URLSearchParams(window.location.search)

      // For hash-based routing (e.g., /#/user/login?ref=1)
      let hashParams = new URLSearchParams()
      if (window.location.hash) {
        const hashParts = window.location.hash.split('?')
        if (hashParts.length > 1) {
          hashParams = new URLSearchParams(hashParts[1])
        }
      }

      // Also check router query params (Vue Router)
      const routerRef = this.$route.query.ref || this.$route.query.referral_code

      this.referralCode = routerRef || urlParams.get('ref') || urlParams.get('referral_code') || hashParams.get('ref') || hashParams.get('referral_code') || ''

      if (this.referralCode) {
        console.log('Referral code detected:', this.referralCode)
        // Auto switch to register tab if referral code is present
        if (this.securityConfig.registration_enabled) {
          this.activeTab = 'register'
        }
      }
    },

    handleOAuthCallback () {
      const urlParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '')
      const oauthToken = urlParams.get('oauth_token') || hashParams.get('oauth_token')
      const oauthError = urlParams.get('oauth_error') || hashParams.get('oauth_error')

      if (oauthError) {
        this.oauthError = this.$t(`user.oauth.error.${oauthError}`) || `OAuth error: ${oauthError}`
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0])
        return
      }

      if (oauthToken) {
        this.oauthProcessing = true
        // NOTE: storage expire plugin expects an absolute timestamp (ms since epoch),
        // not a duration. Use "now + 7 days" to avoid immediate expiration.
        storage.set(ACCESS_TOKEN, oauthToken, new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0])
        this.$store.dispatch('GetInfo').then(() => {
          this.$router.push({ path: '/' })
          this.$notification.success({
            message: 'Welcome',
            description: `${timeFix()}, welcome back.`
          })
        }).catch(err => {
          this.oauthProcessing = false
          this.oauthError = 'Failed to get user info'
          console.error('OAuth login error:', err)
          storage.remove(ACCESS_TOKEN)
        })
      }
    },

    // ==================== Password Login ====================
    handleLogin (e) {
      e.preventDefault()
      this.legalError = false
      if (!this.legalAgreed) {
        this.legalError = true
        return
      }

      this.loginForm.validateFields(['username', 'password'], async (err, values) => {
        if (err) return

        this.loginLoading = true
        this.loginError = ''

        let turnstileClearance
        try {
          turnstileClearance = await this.getTurnstileClearance()
        } catch (e) {
          this.loginLoading = false
          this.loginError = this.$t('user.security.verificationFailed')
          return
        }

        this.Login({ ...values, turnstile_clearance: turnstileClearance })
          .then((res) => {
            if (res && res.data && res.data.mfa_required) {
              this.mfaChallengeId = res.data.challenge_id
              this.mfaLoginCode = ''
              this.mfaLoginError = ''
              this.mfaLoginVisible = true
              return
            }
            this.afterLoginSuccess()
          })
          .catch(err => {
            const response = err.response || {}
            const data = response.data || {}
            this.loginError = data.msg || err.message || 'Login failed'
            if (this.isTurnstileErrorMessage(this.loginError)) {
              this.resetSharedTurnstile()
            }
          })
          .finally(() => {
            this.loginLoading = false
          })
      })
    },

    async handleMfaLoginVerify () {
      const code = (this.mfaLoginCode || '').trim()
      if (!code) {
        this.mfaLoginError = this.$t('user.login.mfa.required') || 'Please enter the verification code'
        return
      }
      this.mfaLoginLoading = true
      this.mfaLoginError = ''
      try {
        const res = await verifyLoginMfa({
          challenge_id: this.mfaChallengeId,
          code
        })
        if (res.code === 1 && res.data && res.data.token) {
          this.applyLoginResult(res.data)
          this.resetMfaLogin()
          this.afterLoginSuccess()
        } else {
          this.mfaLoginError = res.msg || this.$t('user.login.mfa.failed') || 'Verification failed'
        }
      } catch (err) {
        this.mfaLoginError = err.response?.data?.msg || err.message || this.$t('user.login.mfa.failed') || 'Verification failed'
      } finally {
        this.mfaLoginLoading = false
      }
    },

    resetMfaLogin () {
      this.mfaLoginVisible = false
      this.mfaLoginCode = ''
      this.mfaLoginError = ''
      this.mfaChallengeId = ''
    },

    afterLoginSuccess () {
      this.$router.push({ path: '/' })
      this.$notification.success({
        message: 'Welcome',
        description: `${timeFix()}, welcome back.`
      })
      this.$nextTick(() => promptChangeInitialPassword())
    },

    applyLoginResult (data) {
      const expiresAt = new Date().getTime() + 7 * 24 * 60 * 60 * 1000
      storage.set(ACCESS_TOKEN, data.token, expiresAt)
      this.$store.commit('SET_TOKEN', data.token)

      if (data.userinfo) {
        const userInfoData = { ...data.userinfo }
        if (typeof userInfoData.is_demo === 'undefined') {
          userInfoData.is_demo = false
        }

        storage.set(USER_INFO, userInfoData, expiresAt)
        this.$store.commit('SET_INFO', userInfoData)

        const name = userInfoData.nickname || userInfoData.username || 'User'
        this.$store.commit('SET_NAME', { name, welcome: timeFix() })
        this.$store.commit('SET_AVATAR', userInfoData.avatar || '/avatar2.jpg')

        let roles = [{ id: 'default', permissionList: [] }]
        if (userInfoData.role) {
          if (Array.isArray(userInfoData.role)) {
            roles = userInfoData.role
          } else if (typeof userInfoData.role === 'object') {
            roles = [userInfoData.role]
          } else {
            roles = [{ id: userInfoData.role, permissionList: [] }]
          }
        }
        storage.set(USER_ROLES, roles, expiresAt)
        this.$store.commit('SET_ROLES', roles)
      }
    },

    // ==================== Email Code Login ====================
    async handleCodeLoginSendCode () {
      this.codeLoginForm.validateFields(['email'], async (err, values) => {
        if (err) return

        this.codeLoginSendingCode = true
        this.codeLoginError = ''

        try {
          const turnstileClearance = await this.getTurnstileClearance()
          const res = await sendVerificationCode({
            email: values.email,
            type: 'login',
            turnstile_clearance: turnstileClearance
          })

          if (res.code === 1) {
            this.$message.success(this.$t('user.login.codeSent') || 'Verification code sent')
            this.startCodeLoginCountdown()
          } else {
            this.codeLoginError = res.msg || 'Failed to send code'
            if (this.isTurnstileErrorMessage(this.codeLoginError)) {
              this.resetSharedTurnstile()
            }
          }
        } catch (e) {
          this.codeLoginError = e.response?.data?.msg || this.$t('user.security.verificationFailed') || 'Failed to send code'
          if (this.isTurnstileErrorMessage(this.codeLoginError)) {
            this.resetSharedTurnstile()
          }
        } finally {
          this.codeLoginSendingCode = false
        }
      })
    },

    startCodeLoginCountdown () {
      this.codeLoginCountdown = 60
      this.codeLoginCountdownTimer = setInterval(() => {
        this.codeLoginCountdown--
        if (this.codeLoginCountdown <= 0) {
          clearInterval(this.codeLoginCountdownTimer)
          this.codeLoginCountdownTimer = null
        }
      }, 1000)
    },

    handleCodeLogin (e) {
      e.preventDefault()
      this.legalError = false
      if (!this.legalAgreed) {
        this.legalError = true
        return
      }

      this.codeLoginForm.validateFields(async (err, values) => {
        if (err) return

        this.codeLoginLoading = true
        this.codeLoginError = ''

        try {
          const res = await loginWithCode({
            email: values.email,
            code: values.code,
            referral_code: this.referralCode
          })

          if (res.code === 1 && res.data?.token) {
            const expiresAt = new Date().getTime() + 7 * 24 * 60 * 60 * 1000
            storage.set(ACCESS_TOKEN, res.data.token, expiresAt)
            this.$store.commit('SET_TOKEN', res.data.token)

            if (res.data.userinfo) {
              const userInfoData = { ...res.data.userinfo }
              if (typeof userInfoData.is_demo === 'undefined') {
                userInfoData.is_demo = false
              }

              storage.set(USER_INFO, userInfoData, expiresAt)
              this.$store.commit('SET_INFO', userInfoData)

              if (userInfoData.nickname) {
                this.$store.commit('SET_NAME', { name: userInfoData.nickname, welcome: timeFix() })
              } else if (userInfoData.username) {
                this.$store.commit('SET_NAME', { name: userInfoData.username, welcome: timeFix() })
              }

              if (userInfoData.avatar) {
                this.$store.commit('SET_AVATAR', userInfoData.avatar)
              }

              let roles = []
              if (userInfoData.role) {
                if (Array.isArray(userInfoData.role)) {
                  roles = userInfoData.role
                } else if (typeof userInfoData.role === 'object') {
                  roles = [userInfoData.role]
                } else {
                  roles = [{ id: userInfoData.role, permissionList: [] }]
                }
              } else {
                roles = [{ id: 'default', permissionList: [] }]
              }
              this.$store.commit('SET_ROLES', roles)
              storage.set(USER_ROLES, roles, expiresAt)
            }

            await this.$nextTick()

            const currentToken = storage.get(ACCESS_TOKEN)
            const currentRoles = this.$store.getters.roles
            console.log('Token after save:', currentToken ? (typeof currentToken === 'string' ? 'string' : typeof currentToken) : 'missing')
            console.log('Roles after save:', currentRoles.length > 0 ? `has ${currentRoles.length} roles` : 'empty')

            if (currentRoles.length === 0) {
              const defaultRoles = [{ id: 'default', permissionList: [] }]
              this.$store.commit('SET_ROLES', defaultRoles)
              storage.set(USER_ROLES, defaultRoles, expiresAt)
            }

            await new Promise(resolve => setTimeout(resolve, 200))

            this.$store.dispatch('ResetRoutes')

            const isNew = res.data.is_new_user
            this.$router.push({ path: '/' }).then(() => {
              this.$notification.success({
                message: isNew ? (this.$t('user.login.welcomeNew') || 'Welcome!') : 'Welcome',
                description: isNew
                  ? (this.$t('user.login.accountCreated') || 'Your account has been created.')
                  : `${timeFix()}, welcome back.`
              })
            }).catch(err => {
              console.error('Router push error:', err)
              this.$notification.success({
                message: isNew ? (this.$t('user.login.welcomeNew') || 'Welcome!') : 'Welcome',
                description: isNew
                  ? (this.$t('user.login.accountCreated') || 'Your account has been created.')
                  : `${timeFix()}, welcome back.`
              })
            })
          } else {
            this.codeLoginError = res.msg || 'Login failed'
          }
        } catch (e) {
          this.codeLoginError = e.response?.data?.msg || 'Login failed'
        } finally {
          this.codeLoginLoading = false
        }
      })
    },

    // ==================== Register ====================
    checkRegPassword (e) {
      const password = e.target.value || ''
      this.regHasMinLength = password.length >= 8
      this.regHasUppercase = /[A-Z]/.test(password)
      this.regHasLowercase = /[a-z]/.test(password)
      this.regHasNumber = /[0-9]/.test(password)
    },

    validateRegPassword (rule, value, callback) {
      if (!value) { callback(); return }
      if (value.length < 8) { callback(new Error(this.$t('user.register.pwdMinLength') || 'At least 8 characters')); return }
      if (!/[A-Z]/.test(value)) { callback(new Error(this.$t('user.register.pwdUppercase') || 'At least one uppercase letter')); return }
      if (!/[a-z]/.test(value)) { callback(new Error(this.$t('user.register.pwdLowercase') || 'At least one lowercase letter')); return }
      if (!/[0-9]/.test(value)) { callback(new Error(this.$t('user.register.pwdNumber') || 'At least one number')); return }
      callback()
    },

    validateRegConfirmPassword (rule, value, callback) {
      const password = this.registerForm.getFieldValue('password')
      if (value && value !== password) {
        callback(new Error(this.$t('user.register.passwordMismatch') || 'Passwords do not match'))
      } else {
        callback()
      }
    },

    async handleRegisterSendCode () {
      this.registerForm.validateFields(['email'], async (err, values) => {
        if (err) return

        this.registerSendingCode = true
        this.registerError = ''

        try {
          const turnstileClearance = await this.getTurnstileClearance()
          const res = await sendVerificationCode({
            email: values.email,
            type: 'register',
            turnstile_clearance: turnstileClearance
          })

          if (res.code === 1) {
            this.$message.success(this.$t('user.register.codeSent') || 'Verification code sent')
            this.startRegisterCountdown()
          } else {
            this.registerError = res.msg || 'Failed to send code'
            if (this.isTurnstileErrorMessage(this.registerError)) {
              this.resetSharedTurnstile()
            }
          }
        } catch (e) {
          this.registerError = e.response?.data?.msg || this.$t('user.security.verificationFailed') || 'Failed to send code'
          if (this.isTurnstileErrorMessage(this.registerError)) {
            this.resetSharedTurnstile()
          }
        } finally {
          this.registerSendingCode = false
        }
      })
    },

    startRegisterCountdown () {
      this.registerCountdown = 60
      this.registerCountdownTimer = setInterval(() => {
        this.registerCountdown--
        if (this.registerCountdown <= 0) {
          clearInterval(this.registerCountdownTimer)
          this.registerCountdownTimer = null
        }
      }, 1000)
    },

    handleRegister (e) {
      e.preventDefault()
      this.legalError = false
      if (!this.legalAgreed) {
        this.legalError = true
        return
      }

      this.registerForm.validateFields(async (err, values) => {
        if (err) return

        this.registerLoading = true
        this.registerError = ''

        try {
          const res = await register({
            email: values.email,
            code: values.code,
            username: values.username,
            password: values.password,
            referral_code: this.referralCode
          })

          if (res.code === 1) {
            this.$message.success(this.$t('user.register.success') || 'Registration successful')

            if (res.data?.token) {
              const expiresAt = new Date().getTime() + 7 * 24 * 60 * 60 * 1000
              storage.set(ACCESS_TOKEN, res.data.token, expiresAt)
              this.$store.commit('SET_TOKEN', res.data.token)

              if (res.data.userinfo) {
                const userInfoData = { ...res.data.userinfo }
                if (typeof userInfoData.is_demo === 'undefined') {
                  userInfoData.is_demo = false
                }

                storage.set(USER_INFO, userInfoData, expiresAt)
                this.$store.commit('SET_INFO', userInfoData)

                if (userInfoData.nickname) {
                  this.$store.commit('SET_NAME', { name: userInfoData.nickname, welcome: timeFix() })
                } else if (userInfoData.username) {
                  this.$store.commit('SET_NAME', { name: userInfoData.username, welcome: timeFix() })
                }

                if (userInfoData.avatar) {
                  this.$store.commit('SET_AVATAR', userInfoData.avatar)
                }

                let roles = []
                if (userInfoData.role) {
                  if (Array.isArray(userInfoData.role)) {
                    roles = userInfoData.role
                  } else if (typeof userInfoData.role === 'object') {
                    roles = [userInfoData.role]
                  } else {
                    roles = [{ id: userInfoData.role, permissionList: [] }]
                  }
                } else {
                  roles = [{ id: 'default', permissionList: [] }]
                }
              this.$store.commit('SET_ROLES', roles)
              storage.set(USER_ROLES, roles, expiresAt)
              }

              await this.$nextTick()

              const currentToken = storage.get(ACCESS_TOKEN)
              const currentRoles = this.$store.getters.roles
              console.log('Register - Token after save:', currentToken ? (typeof currentToken === 'string' ? 'string' : typeof currentToken) : 'missing')
              console.log('Register - Roles after save:', currentRoles.length > 0 ? `has ${currentRoles.length} roles` : 'empty')

              if (currentRoles.length === 0) {
                const defaultRoles = [{ id: 'default', permissionList: [] }]
                this.$store.commit('SET_ROLES', defaultRoles)
                storage.set(USER_ROLES, defaultRoles, expiresAt)
              }

              await new Promise(resolve => setTimeout(resolve, 200))

              this.$store.dispatch('ResetRoutes')

              this.$router.push({ path: '/' }).then(() => {
                this.$notification.success({
                  message: 'Welcome',
                  description: `${timeFix()}, welcome to QuantDinger!`
                })
              }).catch(err => {
                console.error('Router push error:', err)
                this.$notification.success({
                  message: 'Welcome',
                  description: `${timeFix()}, welcome to QuantDinger!`
                })
              })
            } else {
              this.activeTab = 'login'
              this.$message.info(this.$t('user.register.pleaseLogin') || 'Please login with your new account')
            }
          } else {
            this.registerError = res.msg || 'Registration failed'
          }
        } catch (e) {
          this.registerError = e.response?.data?.msg || 'Registration failed'
        } finally {
          this.registerLoading = false
        }
      })
    },

    // ==================== Reset Password ====================
    resetResetModal () {
      this.resetStep = 1
      this.resetError = ''
      this.resetEmail = ''
      this.resetCode = ''
      this.resetCountdown = 0
      if (this.resetCountdownTimer) {
        clearInterval(this.resetCountdownTimer)
        this.resetCountdownTimer = null
      }
    },

    async handleResetSendCode () {
      this.resetForm.validateFields(['email'], async (err, values) => {
        if (err) return

        this.resetSendingCode = true
        this.resetError = ''

        try {
          const turnstileClearance = await this.getTurnstileClearance()
          const res = await sendVerificationCode({
            email: values.email,
            type: 'reset_password',
            turnstile_clearance: turnstileClearance
          })

          if (res.code === 1) {
            this.$message.success(this.$t('user.resetPassword.codeSent') || 'Verification code sent')
            this.startResetCountdown()
          } else {
            this.resetError = res.msg || 'Failed to send code'
            if (this.isTurnstileErrorMessage(this.resetError)) {
              this.resetSharedTurnstile()
            }
          }
        } catch (e) {
          this.resetError = e.response?.data?.msg || this.$t('user.security.verificationFailed') || 'Failed to send code'
          if (this.isTurnstileErrorMessage(this.resetError)) {
            this.resetSharedTurnstile()
          }
        } finally {
          this.resetSendingCode = false
        }
      })
    },

    startResetCountdown () {
      this.resetCountdown = 60
      this.resetCountdownTimer = setInterval(() => {
        this.resetCountdown--
        if (this.resetCountdown <= 0) {
          clearInterval(this.resetCountdownTimer)
          this.resetCountdownTimer = null
        }
      }, 1000)
    },

    handleResetVerify (e) {
      e.preventDefault()
      this.resetError = ''

      this.resetForm.validateFields((err, values) => {
        if (err) return

        this.resetEmail = values.email
        this.resetCode = values.code
        this.resetStep = 2
      })
    },

    checkResetPassword (e) {
      const password = e.target.value || ''
      this.resetHasMinLength = password.length >= 8
      this.resetHasUppercase = /[A-Z]/.test(password)
      this.resetHasLowercase = /[a-z]/.test(password)
      this.resetHasNumber = /[0-9]/.test(password)
    },

    validateResetPassword (rule, value, callback) {
      if (!value) { callback(); return }
      if (value.length < 8) { callback(new Error(this.$t('user.register.pwdMinLength') || 'At least 8 characters')); return }
      if (!/[A-Z]/.test(value)) { callback(new Error(this.$t('user.register.pwdUppercase') || 'At least one uppercase letter')); return }
      if (!/[a-z]/.test(value)) { callback(new Error(this.$t('user.register.pwdLowercase') || 'At least one lowercase letter')); return }
      if (!/[0-9]/.test(value)) { callback(new Error(this.$t('user.register.pwdNumber') || 'At least one number')); return }
      callback()
    },

    validateResetConfirmPassword (rule, value, callback) {
      const password = this.resetPwdForm.getFieldValue('new_password')
      if (value && value !== password) {
        callback(new Error(this.$t('user.register.passwordMismatch') || 'Passwords do not match'))
      } else {
        callback()
      }
    },

    async handleResetPassword (e) {
      e.preventDefault()
      this.resetError = ''

      this.resetPwdForm.validateFields(async (err, values) => {
        if (err) return

        this.resetLoading = true

        try {
          const res = await resetPassword({
            email: this.resetEmail,
            code: this.resetCode,
            new_password: values.new_password
          })

          if (res.code === 1) {
            this.resetStep = 3
          } else {
            this.resetError = res.msg || 'Failed to reset password'
            if (res.msg?.includes('code') || res.msg?.includes('expired')) {
              this.resetStep = 1
            }
          }
        } catch (e) {
          this.resetError = e.response?.data?.msg || 'Failed to reset password'
        } finally {
          this.resetLoading = false
        }
      })
    },

    // ==================== OAuth ====================
    handleGoogleLogin () {
      window.location.href = getGoogleOAuthUrl()
    },

    handleGitHubLogin () {
      window.location.href = getGitHubOAuthUrl()
    }
  }
}
</script>

<style lang="less" scoped>
.main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 40px 0;

  .auth-intro {
    text-align: center;
    margin-bottom: 40px;

    .desc {
      margin-top: 12px;
      color: rgba(0, 0, 0, 0.45);
      font-size: 14px;
    }
  }

  .auth-card {
    min-width: 360px;
    width: 420px;
    background: #fff;
    padding: 32px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

    ::v-deep .ant-input,
    ::v-deep .ant-input-affix-wrapper,
    ::v-deep .ant-input-password,
    ::v-deep .ant-input-password .ant-input {
      background: #fff !important;
      border-color: #d9d9d9 !important;
      color: rgba(0, 0, 0, 0.85) !important;
      box-shadow: none;
    }

    ::v-deep .ant-input:hover,
    ::v-deep .ant-input-affix-wrapper:hover,
    ::v-deep .ant-input-password:hover,
    ::v-deep .ant-input:focus,
    ::v-deep .ant-input-affix-wrapper-focused,
    ::v-deep .ant-input-affix-wrapper:focus,
    ::v-deep .ant-input-password:focus-within {
      border-color: var(--primary-color, #1890ff) !important;
      box-shadow: 0 0 0 2px var(--primary-color-soft, rgba(24, 144, 255, 0.12)) !important;
    }

    ::v-deep .ant-input::placeholder,
    ::v-deep .ant-input-password .ant-input::placeholder {
      color: rgba(0, 0, 0, 0.35) !important;
    }

    ::v-deep .ant-input-prefix,
    ::v-deep .ant-input-suffix,
    ::v-deep .ant-input-password-icon,
    ::v-deep .ant-input-password .anticon {
      color: rgba(0, 0, 0, 0.25) !important;
    }

    ::v-deep .ant-btn-default {
      background: #fff !important;
      border-color: #d9d9d9 !important;
      color: rgba(0, 0, 0, 0.65) !important;
    }

    ::v-deep .ant-btn-default:hover,
    ::v-deep .ant-btn-default:focus {
      border-color: var(--primary-color, #1890ff) !important;
      color: var(--primary-color, #1890ff) !important;
    }
  }

  .oauth-processing {
    text-align: center;
    padding: 40px 0;

    p {
      margin-top: 16px;
      color: rgba(0, 0, 0, 0.45);
    }
  }

  .auth-form {
    width: 100%;

    ::v-deep .ant-form-item-control-wrapper,
    ::v-deep .ant-form-item-control,
    ::v-deep .ant-input,
    ::v-deep .ant-input-affix-wrapper,
    ::v-deep .ant-input-password,
    ::v-deep .ant-btn-block {
      width: 100%;
    }

    .submit-button {
      padding: 0 15px;
      font-size: 16px;
      height: 40px;
    }
  }

  .login-method-switch {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 24px;

    a {
      color: rgba(0, 0, 0, 0.45);
      font-size: 14px;
      cursor: pointer;
      padding: 4px 0;
      border-bottom: 2px solid transparent;
      transition: all 0.3s;

      &:hover {
        color: var(--primary-color, #1890ff);
      }

      &.active {
        color: var(--primary-color, #1890ff);
        border-bottom-color: var(--primary-color, #1890ff);
        font-weight: 500;
      }
    }

    .ant-divider {
      margin: 0 16px;
    }
  }

  .code-login-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 16px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.45);

    .anticon {
      color: var(--primary-color, #1890ff);
    }
  }

  .auth-links {
    text-align: center;
    margin-top: 16px;
    font-size: 14px;

    a {
      color: var(--primary-color, #1890ff);
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .oauth-section {
    margin-top: 24px;

    .ant-divider {
      color: rgba(0, 0, 0, 0.45);
      font-size: 13px;
    }

    .oauth-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;

      .oauth-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 40px;
        font-size: 14px;

        .oauth-icon {
          width: 18px;
          height: 18px;
        }

        .anticon {
          font-size: 18px;
        }
      }

      .google-btn {
        border-color: #d9d9d9;
        color: rgba(0, 0, 0, 0.65);

        &:hover {
          border-color: #4285F4;
          color: #4285F4;
        }
      }

      .github-btn {
        border-color: #d9d9d9;
        color: rgba(0, 0, 0, 0.65);

        &:hover {
          border-color: #24292e;
          color: #24292e;
        }
      }
    }
  }

  .legal-wrap {
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid #ececea;

    .legal-agree {
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: #61615d;
      font-size: 12px;
      line-height: 1.65;

      .ant-checkbox-wrapper {
        display: inline-flex;
        align-items: flex-start;
        white-space: normal;
      }

      .ant-checkbox {
        margin-top: 3px;
      }

      .ant-checkbox + span {
        display: inline;
        padding-left: 8px;
      }

      .policy-link {
        margin: 0 3px;
        color: #22221f;
        font-weight: 600;
        text-decoration: underline;
        text-decoration-color: #c9c9c3;
        text-underline-offset: 3px;

        &:hover {
          color: var(--login-accent, #faad14);
          text-decoration-color: currentColor;
        }
      }
    }

    .legal-error {
      color: #ff4d4f;
      font-size: 12px;
      line-height: 1.4;
    }
  }

  .mfa-login-panel {
    .mfa-login-error {
      margin-top: 8px;
      color: #ff4d4f;
      font-size: 13px;
      line-height: 1.5;
    }
  }
}

.email-display {
  background: #f5f5f5;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 24px;
  font-size: 14px;

  span {
    color: rgba(0, 0, 0, 0.45);
  }

  strong {
    color: rgba(0, 0, 0, 0.85);
    margin-left: 8px;
  }
}

.success-panel {
  padding: 20px 0;
}

.password-requirements {
  font-size: 13px;

  > div {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    color: #ff4d4f;

    &.valid {
      color: #52c41a;
    }

    .anticon {
      font-size: 14px;
    }
  }
}

::v-deep .turnstile-modal-wrap {
  .ant-modal {
    max-width: calc(100vw - 32px);
  }

  .ant-modal-mask {
    background: rgba(15, 23, 42, 0.42);
    backdrop-filter: blur(3px);
  }

  .ant-modal-content {
    overflow: hidden;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 22px 60px rgba(15, 23, 42, 0.22);
  }

  .ant-modal-header {
    padding: 18px 22px;
    border-bottom: 1px solid #edf2f7;
    background: #ffffff;
  }

  .ant-modal-title {
    color: #111827;
    font-size: 17px;
    font-weight: 700;
  }

  .ant-modal-close {
    color: #64748b;

    &:hover {
      color: #111827;
    }
  }

  .ant-modal-body {
    padding: 24px 24px 26px;
    background: #ffffff;
  }
}

.turnstile-modal-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;

  .anticon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    color: #2f8f14;
    background: rgba(82, 196, 26, 0.12);
  }
}

.turnstile-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.turnstile-modal-desc {
  max-width: 320px;
  margin: 0 0 18px;
  color: #475569;
  font-size: 14px;
  line-height: 1.65;
  text-align: center;
}

.turnstile-widget-shell {
  width: 100%;
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
}

.turnstile-modal-content ::v-deep .turnstile-container {
  margin: 0;
  min-height: 72px;
  justify-content: center;
}

.turnstile-modal-content ::v-deep .turnstile-error {
  max-width: 320px;
  text-align: center;
}

.main {
  display: block;
  width: 100%;
  min-height: 0;
  padding: 0;

  .auth-card {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    padding: 26px 30px 24px;
    background: #fff;
    border: 1px solid #dededb;
    border-radius: 10px;
    box-shadow: 0 18px 50px rgba(16, 16, 16, 0.08);

    ::v-deep .ant-tabs-bar {
      margin-bottom: 24px;
      border-bottom-color: #ececea;
    }

    ::v-deep .ant-tabs-nav {
      width: 100%;
    }

    ::v-deep .ant-tabs-nav > div {
      display: flex;
      width: 100%;
    }

    ::v-deep .ant-tabs-tab {
      flex: 1 1 0;
      margin: 0;
      padding: 4px 12px 15px;
      color: #8b8b87;
      font-size: 15px;
      font-weight: 600;
      text-align: center;
    }

    ::v-deep .ant-tabs-tab:hover,
    ::v-deep .ant-tabs-tab-active {
      color: #171717;
    }

    ::v-deep .ant-tabs-ink-bar {
      height: 2px;
      background: var(--login-accent, #faad14);
    }

    ::v-deep .ant-form-item {
      margin-bottom: 16px;
    }

    ::v-deep .ant-input,
    ::v-deep .ant-input-affix-wrapper,
    ::v-deep .ant-input-password,
    ::v-deep .ant-input-password .ant-input {
      min-height: 46px;
      color: #191919 !important;
      background: #fbfbfa !important;
      border-color: #d8d8d4 !important;
      border-radius: 6px;
    }

    ::v-deep .ant-input:hover,
    ::v-deep .ant-input-affix-wrapper:hover,
    ::v-deep .ant-input-password:hover {
      border-color: #999 !important;
    }

    ::v-deep .ant-input:focus,
    ::v-deep .ant-input-affix-wrapper-focused,
    ::v-deep .ant-input-affix-wrapper:focus,
    ::v-deep .ant-input-password:focus-within {
      border-color: #1b1b1b !important;
      box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08) !important;
    }

    ::v-deep .ant-input::placeholder,
    ::v-deep .ant-input-password .ant-input::placeholder {
      color: #a2a2a0 !important;
    }

    ::v-deep .ant-input-prefix,
    ::v-deep .ant-input-suffix,
    ::v-deep .ant-input-password-icon,
    ::v-deep .ant-input-password .anticon {
      color: #8a8a86 !important;
    }

    ::v-deep .ant-alert {
      border-radius: 6px;
    }

    ::v-deep .ant-checkbox-checked .ant-checkbox-inner {
      background: #171717;
      border-color: #171717;
    }

    ::v-deep .ant-checkbox:hover .ant-checkbox-inner,
    ::v-deep .ant-checkbox-input:focus + .ant-checkbox-inner {
      border-color: #171717;
    }

    ::v-deep .ant-btn-default {
      min-height: 42px;
      color: #3c3c39 !important;
      background: #fff !important;
      border-color: #d8d8d4 !important;
      border-radius: 6px;
    }

    ::v-deep .ant-btn-default:hover,
    ::v-deep .ant-btn-default:focus {
      color: #111 !important;
      border-color: #8d8d88 !important;
    }
  }

  .oauth-processing {
    padding: 64px 0;

    p {
      color: #777;
    }
  }

  .auth-form {
    .submit-button {
      height: 46px;
      color: #fff;
      font-size: 15px;
      font-weight: 650;
      background: #171717;
      border-color: #171717;
      border-radius: 6px;
      box-shadow: none;

      &:hover,
      &:focus {
        color: #171717;
        background: var(--login-accent, #faad14);
        border-color: var(--login-accent, #faad14);
      }
    }
  }

  .login-method-switch {
    justify-content: stretch;
    gap: 4px;
    margin-bottom: 20px;
    padding: 4px;
    background: #f2f2f0;
    border-radius: 7px;

    .ant-divider {
      display: none;
    }

    a {
      flex: 1 1 0;
      padding: 8px 10px;
      color: #7d7d79;
      line-height: 20px;
      text-align: center;
      border: 0;
      border-radius: 5px;

      &:hover {
        color: #171717;
      }

      &.active {
        color: #171717;
        font-weight: 650;
        background: #fff;
        border: 0;
        box-shadow: 0 1px 4px rgba(16, 16, 16, 0.08);
      }
    }
  }

  .auth-links {
    margin-top: 14px;
    text-align: right;

    a {
      color: #5d5d59;

      &:hover {
        color: #111;
        text-decoration: none;
      }
    }
  }

  .code-login-hint {
    color: #858581;

    .anticon {
      color: color-mix(in srgb, var(--login-accent, #faad14) 72%, #171717);
    }
  }

  .oauth-section {
    margin-top: 24px;

    .ant-divider {
      margin: 0 0 16px;
      color: #858581;
      font-size: 11px;
      font-weight: 650;
      letter-spacing: 0.06em;
      text-transform: uppercase;

      &::before,
      &::after {
        border-top-color: #dededb;
      }
    }

    .oauth-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;

      .oauth-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        min-height: 46px;
        padding: 0 16px;
        color: #272724 !important;
        font-size: 14px;
        font-weight: 600;
        background: #fff !important;
        border-color: #d8d8d4 !important;
        border-radius: 6px;
        box-shadow: 0 1px 2px rgba(16, 16, 16, 0.03);
        transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, transform 160ms ease;

        .oauth-icon,
        .anticon {
          flex: 0 0 auto;
          width: 18px;
          height: 18px;
          font-size: 18px;
        }

        &:hover {
          color: #111 !important;
          background: #f7f7f5 !important;
          border-color: #9b9b96 !important;
          box-shadow: 0 5px 14px rgba(16, 16, 16, 0.08);
          transform: translateY(-1px);
        }

        &:focus {
          color: #111 !important;
          border-color: var(--login-accent, #faad14) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--login-accent, #faad14) 16%, transparent);
        }
      }

      .github-btn .anticon {
        color: #1f2328;
      }
    }
  }

  .legal-wrap {
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid #ececea;

    .legal-agree {
      color: #545450;
    }
  }
}

@media (max-width: 576px) {
  .main {
    .auth-card {
      padding: 22px 18px 20px;
      border-radius: 8px;
      box-shadow: 0 12px 34px rgba(16, 16, 16, 0.07);
    }

    .auth-code-row {
      display: flex;
      flex-wrap: nowrap;
      gap: 8px;

      > .ant-col {
        flex: 1 1 auto;
        width: auto;
        padding: 0 !important;
      }

      > .ant-col:last-child {
        flex: 0 0 104px;
      }
    }

    .oauth-buttons {
      flex-direction: column;
    }
  }
}
</style>

<style lang="less">
.turnstile-modal-wrap {
  .ant-modal {
    max-width: calc(100vw - 32px);
  }

  .ant-modal-content {
    overflow: hidden;
    border-radius: 14px;
    background: #ffffff !important;
    box-shadow: 0 22px 60px rgba(15, 23, 42, 0.22);
  }

  .ant-modal-header {
    padding: 18px 22px;
    border-bottom: 1px solid #edf2f7;
    background: #ffffff !important;
  }

  .ant-modal-title,
  .turnstile-modal-title {
    color: #111827 !important;
    font-size: 17px;
    font-weight: 700;
  }

  .turnstile-modal-title {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }

  .turnstile-modal-title .anticon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    color: #2f8f14;
    background: rgba(82, 196, 26, 0.12);
  }

  .ant-modal-close {
    color: #64748b;
  }

  .ant-modal-close:hover {
    color: #111827;
  }

  .ant-modal-body {
    padding: 24px 24px 26px;
    color: #111827 !important;
    background: #ffffff !important;
  }
}

html body .ant-modal-wrap.turnstile-modal-wrap {
  .ant-modal-content {
    background: #ffffff !important;
    color: #111827 !important;
  }

  .ant-modal-header {
    background: #ffffff !important;
    border-bottom-color: #edf2f7 !important;
  }

  .ant-modal-body {
    background: #ffffff !important;
    color: #111827 !important;
  }
}

.policy-modal-wrap,
.reset-password-modal-wrap {
  .ant-modal {
    max-width: calc(100vw - 32px);
  }

  .ant-modal-content {
    overflow: hidden;
    color: #171717;
    background: #fff;
    border: 1px solid #e5e5e1;
    border-radius: 12px;
    box-shadow: 0 24px 64px rgba(16, 16, 16, 0.18);
  }

  .ant-modal-header {
    padding: 20px 24px;
    background: #fff;
    border-bottom: 1px solid #ececea;
  }

  .ant-modal-title {
    color: #171717;
  }

  .ant-modal-close {
    color: #777773;
  }

  .ant-modal-close:hover {
    color: #171717;
  }

  .ant-modal-body {
    padding: 24px;
    color: #171717;
    background: #fff;
  }

  .ant-input,
  .ant-input-affix-wrapper {
    min-height: 44px;
    border-color: #d8d8d4;
    border-radius: 6px;
  }

  .ant-input:focus,
  .ant-input-affix-wrapper:focus,
  .ant-input-affix-wrapper-focused,
  .ant-input-password:focus-within {
    border-color: #1b1b1b;
    box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08);
  }

  .ant-btn {
    min-height: 42px;
    border-radius: 6px;
  }

  .ant-btn-primary {
    color: #fff;
    background: #171717;
    border-color: #171717;
    box-shadow: none;
  }

  .ant-btn-primary:hover,
  .ant-btn-primary:focus {
    color: #fff;
    background: #30302e;
    border-color: #30302e;
  }
}

.policy-modal-wrap {
  .policy-modal-title {
    display: inline-flex;
    align-items: center;
    gap: 11px;
    font-size: 17px;
    font-weight: 700;
  }

  .policy-modal-title .anticon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: var(--login-accent, #faad14);
    background: color-mix(in srgb, var(--login-accent, #faad14) 11%, #fff);
    border: 1px solid color-mix(in srgb, var(--login-accent, #faad14) 24%, #fff);
    border-radius: 8px;
  }

  .policy-modal-content {
    max-height: 52vh;
    padding-right: 10px;
    overflow-y: auto;
    color: #575753;
    font-size: 14px;
    line-height: 1.85;
    white-space: pre-line;
  }

  .policy-modal-content p {
    margin: 0;
  }

  .policy-modal-actions {
    display: flex;
    justify-content: flex-end;
    margin: 22px -24px -24px;
    padding: 16px 24px;
    background: #fafaf8;
    border-top: 1px solid #ececea;
  }

  .policy-modal-actions .ant-btn {
    min-width: 88px;
  }
}

.reset-password-modal-wrap {
  .reset-modal-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .reset-modal-title > .anticon {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    color: var(--login-accent, #faad14);
    background: color-mix(in srgb, var(--login-accent, #faad14) 11%, #fff);
    border: 1px solid color-mix(in srgb, var(--login-accent, #faad14) 24%, #fff);
    border-radius: 9px;
  }

  .reset-modal-heading {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 2px;
  }

  .reset-modal-heading strong {
    color: #171717;
    font-size: 17px;
    line-height: 1.35;
  }

  .reset-modal-heading small {
    overflow: hidden;
    color: #858581;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .reset-stepper {
    display: grid;
    grid-template-columns: max-content 1fr max-content;
    align-items: center;
    gap: 10px;
    margin-bottom: 22px;
    padding: 14px 16px;
    background: #f7f7f5;
    border: 1px solid #ececea;
    border-radius: 8px;
  }

  .reset-step {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #969690;
  }

  .reset-step > span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    color: #777773;
    font-size: 11px;
    font-weight: 700;
    background: #fff;
    border: 1px solid #d8d8d4;
    border-radius: 50%;
  }

  .reset-step strong {
    font-size: 12px;
    font-weight: 650;
    white-space: nowrap;
  }

  .reset-step.active,
  .reset-step.done {
    color: #22221f;
  }

  .reset-step.active > span,
  .reset-step.done > span {
    color: #171717;
    background: color-mix(in srgb, var(--login-accent, #faad14) 15%, #fff);
    border-color: var(--login-accent, #faad14);
  }

  .reset-step-line {
    height: 1px;
    background: #d8d8d4;
  }

  .reset-step-line.active {
    background: var(--login-accent, #faad14);
  }

  .reset-step-copy {
    margin: -2px 0 18px;
    color: #6f6f6a;
    font-size: 13px;
    line-height: 1.6;
  }

  .ant-form-item {
    margin-bottom: 16px;
  }

  .auth-code-row .ant-btn {
    color: #2f2f2c;
    background: #f7f7f5;
    border-color: #d8d8d4;
  }

  .submit-button {
    min-height: 46px;
    font-weight: 650;
  }

  .email-display {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
    padding: 12px 14px;
    background: #f7f7f5;
    border: 1px solid #ececea;
    border-radius: 7px;
  }

  .email-display span {
    color: #858581;
    font-size: 12px;
  }

  .email-display strong {
    overflow-wrap: anywhere;
    color: #252522;
    font-size: 13px;
    text-align: right;
  }

  .auth-links {
    margin-top: 14px;
    text-align: center;
  }

  .auth-links a {
    color: #575753;
    font-size: 13px;
  }

  .auth-links a:hover {
    color: #171717;
  }

  .success-panel {
    padding: 0;
  }

  .success-panel .ant-result {
    padding: 18px 10px 8px;
  }

  .success-panel .ant-result-icon > .anticon {
    color: var(--login-accent, #52c41a);
  }
}

html body .ant-modal-wrap.policy-modal-wrap,
html body .ant-modal-wrap.reset-password-modal-wrap {
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-body {
    color: #171717 !important;
    background: #fff !important;
  }

  .ant-modal-header {
    border-bottom-color: #ececea !important;
  }

  .ant-modal-title {
    color: #171717 !important;
  }

  .ant-input,
  .ant-input-affix-wrapper,
  .ant-input-password {
    color: #252522 !important;
    background: #fff !important;
    border-color: #d8d8d4 !important;
  }

  .ant-input::placeholder {
    color: #a2a29c !important;
  }

  .ant-input-prefix .anticon,
  .ant-input-suffix .anticon {
    color: #8b8b86 !important;
  }

  .policy-modal-title > span,
  .reset-modal-heading > strong {
    color: #171717 !important;
  }

  .reset-modal-heading > small {
    color: #858581 !important;
  }
}

@media (max-width: 576px) {
  .policy-modal-wrap,
  .reset-password-modal-wrap {
    .ant-modal-header,
    .ant-modal-body {
      padding-left: 18px;
      padding-right: 18px;
    }
  }

  .policy-modal-wrap .policy-modal-actions {
    margin-right: -18px;
    margin-left: -18px;
    padding-right: 18px;
    padding-left: 18px;
  }

  .reset-password-modal-wrap {
    .reset-step strong {
      display: none;
    }

    .auth-code-row {
      display: flex;
      flex-wrap: nowrap;
      gap: 8px;
    }

    .auth-code-row > .ant-col {
      flex: 1 1 auto;
      width: auto;
      padding: 0 !important;
    }

    .auth-code-row > .ant-col:last-child {
      flex: 0 0 108px;
    }
  }
}

body.userLayout #userLayout {
  .auth-card .ant-tabs-tab-active,
  .auth-card .ant-tabs-tab-active:hover,
  .auth-card .ant-tabs-tab:hover {
    color: #171717 !important;
  }

  .auth-card .ant-input:focus,
  .auth-card .ant-input-affix-wrapper-focused,
  .auth-card .ant-input-password:focus-within {
    border-color: #1b1b1b !important;
    box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08) !important;
  }
}
</style>
