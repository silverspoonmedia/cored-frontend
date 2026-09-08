import type { RouteRecordRaw } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'

export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: AuthLayout,
    meta: { guestOnly: true, titleKey: 'web.auth.login_title', headingKey: 'web.auth.login_heading' },
    children: [
      {
        path: '',
        name: 'login.view',
        component: () => import('@/views/auth/LoginView.vue'),
      },
    ],
  },
  {
    path: '/register',
    name: 'register',
    component: AuthLayout,
    meta: { guestOnly: true, titleKey: 'web.auth.register_title', headingKey: 'web.auth.register_heading' },
    children: [
      {
        path: '',
        name: 'auth.register.view',
        component: () => import('@/views/auth/RegisterView.vue'),
      },
    ],
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: AuthLayout,
    meta: { guestOnly: true, titleKey: 'web.auth.forgot_password_title', headingKey: 'web.auth.forgot_password_heading' },
    children: [
      {
        path: '',
        name: 'auth.forgot-password.view',
        component: () => import('@/views/auth/ForgotPasswordView.vue'),
      },
    ],
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: AuthLayout,
    meta: { guestOnly: true, titleKey: 'web.auth.reset_password_title', headingKey: 'web.auth.reset_password_heading' },
    children: [
      {
        path: '',
        name: 'auth.reset-password.view',
        component: () => import('@/views/auth/ResetPasswordView.vue'),
      },
    ],
  },
  {
    path: '/verify-email/:id/:hash',
    name: 'verify-email',
    component: AuthLayout,
    meta: { authChrome: true, titleKey: 'web.auth.verify_email_title', headingKey: 'web.auth.verify_email_heading' },
    children: [
      {
        path: '',
        name: 'auth.verify-email.view',
        component: () => import('@/views/auth/VerifyEmailView.vue'),
      },
    ],
  },
  {
    path: '/two-factor-challenge',
    name: 'two-factor.challenge',
    component: AuthLayout,
    meta: { guestOnly: true, titleKey: 'web.auth.two_factor_challenge_title', headingKey: 'web.auth.two_factor_challenge_heading' },
    children: [
      {
        path: '',
        name: 'two-factor.challenge.view',
        component: () => import('@/views/auth/TwoFactorChallengeView.vue'),
      },
    ],
  },
]
