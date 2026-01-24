import emailjs from '@emailjs/browser';

interface BookingParams {
  name: string;
  email: string;
  date: string;
  time: string;
  duration: string;
}

export const sendBookingEmail = async (params: BookingParams) => {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('EmailJS configuration is missing. Please check your .env.local file.');
  }

  try {
    const response = await emailjs.send(
      serviceId,
      templateId,
      {
        to_name: "Himadry", // Your name (or whoever receives the email)
        from_name: params.name,
        from_email: params.email,
        date: params.date,
        time: params.time,
        duration: params.duration,
        message: `New booking request from ${params.name} (${params.email}) for ${params.date} at ${params.time}.`,
      },
      publicKey
    );
    return response;
  } catch (error) {
    console.error('EmailJS Send Failed:', error);
    throw error;
  }
};
