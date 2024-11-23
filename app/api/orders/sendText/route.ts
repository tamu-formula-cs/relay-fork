import nodemailer from 'nodemailer';
import prisma from '../../../lib/prisma';
import { OrderStatus } from '@prisma/client';

const carrier_domain = {
  "AT&T" : "@txt.att.net",
  "Sprint" : "@pm.sprint.com",
  "T-Mobile" : "@tmomail.net",
  "Verizon Wireless" : "@vtext.com",
  "Virgin Mobile" : "@vmobl.com",
  "AT&T Enterprise Paging" : "@page.att.net",
  "Rogers Wireless" : "@sms.rogers.com",
  "Boost Mobile" : "@sms.myboostmobile.com",
  "Telus Mobility" : "@msg.telus.com",
  "Airfire Mobile" : "@sms.airfiremobile.com",
  "Ameritech" : "@paging.acswireless.com",
  "Assurance Wireless" : "@vmobl.com",
  "BellSouth" : "@bellsouth.cl",
  "Bluegrass Cellular" : "@sms.bluecell.com",
  "Cellcom" : "@cellcom.quiktxt.com",
  "Cellular South" : "@csouth1.com",
  "Chariton Valley Wireless" : "@sms.cvalley.net",
  "Chat Mobility" : "@mail.msgsender.com",
  "Cleartalk" : "@sms.cleartalk.us",
  "Consumer Cellular" : "@mailmymobile.net",
  "Cricket" : "@sms.cricketwireless.net",
  "Element Mobile" : "@SMS.elementmobile.net",
  "Esendex" : "@echoemail.net",
  "Mellon Mobile" : "@mellonmobile.ga",
  "MetroPCS" : "@mymetropcs.com",
  "Nextech" : "@sms.ntwls.net",
  "Page Plus Cellular" : "@vtext.com",
  "South Central Communications" : "@rinasms.com",
  "Southernlinc" : "@page.southernlinc.com",
  "Straight Talk" : "@txt.att.net",
  "Syringa Wireless" : "@rinasms.com",
  "Teleflip" : "@teleflip.com",
  "Union Wireless" : "@union-tel.com",
  "US Cellular" : "@email.uscc.net",
  "Voyager Mobile" : "@text.voyagermobile.com",
  "Centennial Wireless" : "@cwemail.com",
  "TracFone" : "@txt.att.net"
};

export async function POST(req: Request) {

    // get all the orders that are now delivered and updated in the last hour

    const timeOffset = new Date();
    timeOffset.setHours(timeOffset.getHours() - 1);

    try {
        const deliveredOrders = await prisma.order.findMany({
            where: {
                status: OrderStatus.DELIVERED,
                updatedAt: {
                    gte: timeOffset,
                },
            },
        });

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587, // assumes unsecure connection  
            secure: false,
            auth: {
              user: process.env.EMAIL_USER, // sender email
              pass: process.env.EMAIL_PASS, // sender password
            },
        });

        // keep list of only unique ids, prevent multiple sends

        const uniqueIds = new Set<number>();

        deliveredOrders.forEach((order) => {
            uniqueIds.add(order.userId);
        });

        // for each unique id, send the text

        uniqueIds.forEach(async (userId) => {
            const orderPlacer = await prisma.user.findUnique({
                where: {
                    id: userId,
                },
            });

            const mailOptions = {
                from: process.env.EMAIL_USER, // sender email
                to: `${orderPlacer?.phone}${carrier_domain[orderPlacer?.carrier]}`, // recipient email-to-sms
                subject: `You have a delivery!`,
                text: `You have an order(s) to be picked up. View your orders: https://relay.tamuformulaelectric.com/backlog. - FSAE EV`,
            };

            try {
                await transporter.sendMail(mailOptions);
            } catch (error) {
                console.error('Error sending email:', error);
                return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500 });
            }
        });

    } catch (error) {
        console.error(error);
    }
    return new Response(JSON.stringify({ message: "Email sent successfully" }), { status: 200 });
}