'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FiMail, FiArrowLeft, FiCheckCircle } from 'react-icons/fi'
import { HiX } from 'react-icons/hi'
import { ImSpinner2 } from 'react-icons/im'
import { resetPassword } from '@/lib/services/auth'
import { formatFirebaseError } from '@/lib/utils/error-handler'
import { useEffect } from 'react'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)

    // Auto-hide error after 5 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setMessage('')
        setLoading(true)

        try {
            if (!email) {
                setError('Please enter your email address')
                setLoading(false)
                return
            }

            const response = await resetPassword(email.trim().toLowerCase())
            setMessage(response.message)
        } catch (err) {
            setError(formatFirebaseError(err));
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all">
                <div className="p-8 lg:p-10">
                    {message ? (
                        <div className="animate-in fade-in zoom-in-95 duration-500">
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mx-auto mb-6 shadow-inner text-indigo-600 dark:text-indigo-400">
                                    <FiCheckCircle className="h-10 w-10" />
                                </div>
                                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">
                                    Check Your Email
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                                    We've sent a password reset link to <span className="text-indigo-600 dark:text-indigo-400 font-bold">{email}</span>. Please check your inbox and follow the instructions.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <Link
                                    href="/login"
                                    className="block w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98] text-center"
                                >
                                    Return to Login
                                </Link>
                                <button
                                    onClick={() => setMessage('')}
                                    className="w-full text-sm font-bold text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                >
                                    Didn't receive it? Try again
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-10">
                                <Link
                                    href="/login"
                                    className="mb-8 inline-flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-all group"
                                >
                                    <FiArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                    Back to login
                                </Link>
                                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">
                                    Forgot Password?
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                                    Enter your registered email address and we'll send you instructions to reset your password.
                                </p>
                            </div>

                            {error && (
                                <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 rounded-lg animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center">
                                        <HiX className="h-5 w-5 text-red-500 mr-3" />
                                        <p className="text-sm text-red-700 dark:text-red-400 font-semibold">{error}</p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2.5 ml-1">
                                        Email Address
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <FiMail className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white transition-all text-lg"
                                            placeholder="name@company.com"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !email}
                                    className="w-full px-4 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-200 dark:shadow-none active:scale-[0.98] flex items-center justify-center text-lg"
                                >
                                    {loading ? (
                                        <>
                                            <ImSpinner2 className="animate-spin mr-3 h-5 w-5 text-white" />
                                            Sending Link...
                                        </>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </button>

                                <div className="pt-6 text-center border-t border-gray-100 dark:border-gray-800">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Suddenly remembered?{' '}
                                        <Link href="/login" className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors underline-offset-4 hover:underline">
                                            Log in here
                                        </Link>
                                    </p>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </main>
    )
}
