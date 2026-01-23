'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { applyActionCode, checkActionCode } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { syncMainByEmail } from '@/lib/services/auth'
import Link from 'next/link'
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi'

function VerifyContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [status, setStatus] = useState('verifying') // 'verifying', 'success', 'error'
    const [message, setMessage] = useState('Verifying your email address...')
    const verificationStarted = useRef(false)

    useEffect(() => {
        if (verificationStarted.current) return

        const oobCode = searchParams.get('oobCode')
        const mode = searchParams.get('mode')

        if (mode === 'verifyEmail' && oobCode) {
            verificationStarted.current = true
            handleVerify(oobCode)
        } else if (!oobCode) {
            // If No code, just show a message.
            setStatus('success')
            setMessage('Account Verification Page')
        } else {
            setStatus('error')
            setMessage('Invalid verification link.')
        }
    }, [searchParams])

    const handleVerify = async (oobCode) => {
        try {
            // 1. Check if the code is valid and get the email
            const info = await checkActionCode(auth, oobCode)
            const email = info.data.email
            console.log('Verification: Extracted email from code:', email)

            // 2. Apply the action code (marks as verified in Firebase)
            await applyActionCode(auth, oobCode)

            // 3. Sync from temp to main table in Postgres
            console.log('Email verified in Firebase, syncing to Postgres main table for:', email)
            const syncResult = await syncMainByEmail(email)

            if (syncResult.success) {
                setStatus('success')
                setMessage('Your email has been verified and your account is now active!')
            }
        } catch (error) {
            console.error('Verification error:', error)
            setStatus('error')

            // Handle specific API error message
            const errorMsg = error.message === 'User not found in temporary storage'
                ? 'Your account may already be verified. Please try signing in.'
                : error.message || 'Failed to verify email. The link may be expired.'

            setMessage(errorMsg)
        }
    }

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all">
                <div className="p-8 lg:p-10 text-center">
                    {status === 'verifying' && (
                        <div className="flex flex-col items-center animate-in fade-in duration-500">
                            <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-6">
                                <FiLoader className="w-10 h-10 text-indigo-600 animate-spin" />
                            </div>
                            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">Verifying...</h2>
                            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{message}</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-6 transition-transform hover:scale-110">
                                <FiCheckCircle className="w-12 h-12 text-green-500" />
                            </div>
                            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">Verified!</h2>
                            <p className="text-gray-600 dark:text-gray-300 font-medium mb-10 leading-relaxed">{message}</p>
                            <Link
                                href="/login"
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-200 dark:shadow-none active:scale-[0.98]"
                            >
                                Sign In Now
                            </Link>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500">
                            <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6">
                                <FiXCircle className="w-12 h-12 text-red-500" />
                            </div>
                            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">Oops!</h2>
                            <p className="text-gray-600 dark:text-gray-300 font-medium mb-10 leading-relaxed">{message}</p>
                            <div className="w-full space-y-4">
                                <Link
                                    href="/login"
                                    className="block w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-200 dark:shadow-none active:scale-[0.98]"
                                >
                                    Try Logging In
                                </Link>
                                <Link
                                    href="/register"
                                    className="block text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition-colors"
                                >
                                    Create a New Account
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}

export default function VerifyPage() {
    return (
        <Suspense fallback={
            <div className="h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
                <FiLoader className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
        }>
            <VerifyContent />
        </Suspense>
    )
}
