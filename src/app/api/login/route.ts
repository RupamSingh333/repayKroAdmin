import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json()

    // Step 1: Send OTP (if no OTP provided)
    if (!otp) {
      const sendOtpRes = await fetch(`${API_BASE_URL}/clientAuth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const sendOtpData = await sendOtpRes.json()

      if (!sendOtpRes.ok || !sendOtpData.success) {
        return NextResponse.json({
          success: false,
          message: sendOtpData.message || 'Failed to send OTP',
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: 'OTP sent successfully',
      })
    }

    // Step 2: Validate OTP
    const validateRes = await fetch(`${API_BASE_URL}/clientAuth/validate-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    })

    const validateData = await validateRes.json()

    if (!validateData.success || !validateData.jwtToken) {
      return NextResponse.json({
        success: false,
        message: validateData.message || 'OTP validation failed',
      }, { status: 401 })
    }

    const token = validateData.jwtToken

    // Step 3: Fetch user data
    const userRes = await fetch(`${API_BASE_URL}/clients/get-client`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const userData = await userRes.json();    

    if (!userData.success) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch user details',
      }, { status: 500 })
    }

    const { customer } = userData.client || {};

    // Step 4: Set JWT token in cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        phone,
        customer: customer || false,
      },
      token,
    });

    // Cookie settings optimized for IP-based hosting
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: false, // Since we're using HTTP
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    return response

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    }, { status: 500 })
  }
}

// GET: Return user info using token from cookie
export async function GET(req: NextRequest) {
    try {
      const token = req.cookies.get('token')?.value
    //   console.log(token)
      if (!token) {
        return NextResponse.json({
          success: false,
          message: 'Unauthorized. No token found.',
        }, { status: 401 })
      }
  
      const userRes = await fetch(`${API_BASE_URL}/clients/get-client`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
  
      const userData = await userRes.json()
    //   console.log(userData)
      if (!userData.success) {
        return NextResponse.json({
          success: false,
          message: 'Failed to fetch user info',
        }, { status: 401 })
      }
  
      return NextResponse.json({
        success: true,
        user: userData.client,
      })
  
    } catch (error) {
      console.error('Get user API error:', error)
      return NextResponse.json({
        success: false,
        message: 'Internal server error',
      }, { status: 500 })
    }
}