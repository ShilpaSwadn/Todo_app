'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { applyActionCode, checkActionCode } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { syncByEmail, resendVerificationEmail } from '@/lib/services/auth'
import Link from 'next/link'
import { FiCheckCircle, FiXCircle, FiLoader, FiMail, FiArrowLeft } from 'react-icons/fi'
import { ImSpinner2 } from 'react-icons/im'
import { formatFirebaseError } from '@/lib/utils/error-handler'

function VerifyContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [status, setStatus] = useState('verifying') // 'verifying', 'success', 'sent', 'error'
    const [title, setTitle] = useState('Verifying...')
    const [message, setMessage] = useState('Verifying your account...')

    const [resending, setResending] = useState(false)
    const [resendStatus, setResendStatus] = useState('')
    const [resendCountdown, setResendCountdown] = useState(0)

    const [emailForResend, setEmailForResend] = useState('')
    const [showEmailInput, setShowEmailInput] = useState(false)

    const verificationStarted = useRef(false)

    useEffect(() => {
        const oobCode = searchParams.get('oobCode')
        const mode = searchParams.get('mode')
        const emailParam = searchParams.get('email')

        if (emailParam) setEmailForResend(emailParam)

        if (mode === 'verifyEmail' && oobCode) {
            if (verificationStarted.current) return
            verificationStarted.current = true
            handleVerify(oobCode)
        } else if (!oobCode) {
            // No code means we likely just redirected here from registration
            setStatus('sent')
            setTitle('Check Your Email')
            setMessage('An account activation link has been sent to your email. Please verify it to activate your account, then you can login.')
        } else {
            setStatus('error')
            setMessage('Invalid verification link.')
        }
    }, [searchParams])

    useEffect(() => {
        let timer;
        if (resendCountdown > 0) {
            timer = setInterval(() => {
                setResendCountdown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [resendCountdown]);

    const handleResend = async (e) => {
        if (e) e.preventDefault();

        if (!emailForResend) {
            setShowEmailInput(true);
            return;
        }

        setResending(true);
        setResendStatus('');
        try {
            const result = await resendVerificationEmail(emailForResend);
            if (result.success) {
                setResendStatus('A new activation link has been sent to your email.');
                setResendCountdown(60);
                setTimeout(() => setResendStatus(''), 5000);
            } else {
                setMessage(result.message || 'We couldn\'t resend the link. Please try again.');
            }
        } catch (err) {
            setMessage(formatFirebaseError(err));
        } finally {
            setResending(false);
        }
    }

    const handleVerify = async (oobCode) => {
        try {
            const info = await checkActionCode(auth, oobCode)
            const email = info.data.email
            setEmailForResend(email)

            await applyActionCode(auth, oobCode)
            const syncResult = await syncByEmail(email)

            if (syncResult.success) {
                setStatus('success')
                setTitle('Verified!')
                setMessage('Your email has been verified and your account is now active!')
            }
        } catch (error) {
            console.error('Verification error:', error)
            setStatus('error')
            setMessage(formatFirebaseError(error))
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
                            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">{title}</h2>
                            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{message}</p>
                        </div>
                    )}

                    {(status === 'success' || status === 'sent') && (
                        <div className="flex flex-col items-center animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-6 transition-transform hover:scale-110">
                                {status === 'success' ? (
                                    <FiCheckCircle className="w-12 h-12 text-green-500" />
                                ) : (
                                    <FiMail className="w-12 h-12 text-indigo-500 font-bold" />
                                )}
                            </div>
                            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">{title}</h2>
                            <p className="text-gray-600 dark:text-gray-300 font-medium mb-10 leading-relaxed text-sm">
                                {message}
                            </p>

                            <div className="w-full space-y-3">
                                {status === 'sent' && (
                                    <button
                                        onClick={handleResend}
                                        disabled={resending || resendCountdown > 0}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white dark:bg-gray-800 border-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all disabled:opacity-50 text-sm shadow-sm"
                                    >
                                        {resending ? (
                                            <ImSpinner2 className="animate-spin h-5 w-5" />
                                        ) : resendCountdown > 0 ? (
                                            `Wait ${resendCountdown}s for resend`
                                        ) : (
                                            <>
                                                <FiMail className="w-5 h-5" />
                                                Resend Code
                                            </>
                                        )}
                                    </button>
                                )}

                                <Link
                                    href="/login"
                                    className="block w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-200 dark:shadow-none active:scale-[0.98] flex items-center justify-center text-sm"
                                >
                                    {status === 'success' ? 'Sign In Now' : 'Go to Login'}
                                </Link>
                            </div>

                            {resendStatus && status === 'sent' && (
                                <p className="mt-4 text-xs text-green-600 dark:text-green-400 font-bold animate-in fade-in slide-in-from-top-2">
                                    {resendStatus}
                                </p>
                            )}
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500">
                            <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6">
                                <FiXCircle className="w-12 h-12 text-red-500" />
                            </div>
                            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">Link Expired</h2>
                            <p className="text-gray-600 dark:text-gray-300 font-medium mb-8 leading-relaxed text-sm">{message}</p>

                            {resendStatus && (
                                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-r-lg w-full text-left">
                                    <p className="text-xs text-green-700 dark:text-green-400 font-bold">{resendStatus}</p>
                                </div>
                            )}

                            <div className="w-full space-y-4">
                                {showEmailInput ? (
                                    <form onSubmit={handleResend} className="space-y-3 animate-in fade-in zoom-in-95">
                                        <div className="relative">
                                            <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="email"
                                                placeholder="Enter your email"
                                                value={emailForResend}
                                                onChange={(e) => setEmailForResend(e.target.value)}
                                                required
                                                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white text-sm"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={resending}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                                        >
                                            {resending ? <ImSpinner2 className="animate-spin" /> : <FiMail />}
                                            {resending ? 'Sending...' : 'Resend Magic Link'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowEmailInput(false)}
                                            className="text-xs font-bold text-gray-400 hover:text-gray-600"
                                        >
                                            Cancel
                                        </button>
                                    </form>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleResend}
                                            disabled={resending}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                                        >
                                            {resending ? <ImSpinner2 className="animate-spin" /> : <FiMail />}
                                            {resending ? 'Sending...' : 'Resend Magic Link'}
                                        </button>

                                        <Link
                                            href="/login"
                                            className="block w-full py-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-all hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                                        >
                                            <FiArrowLeft />
                                            Back to Login
                                        </Link>
                                    </>
                                )}
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
