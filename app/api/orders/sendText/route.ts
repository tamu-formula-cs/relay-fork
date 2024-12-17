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

export async function POST() {

    // get all the orders that are now delivered and updated in the last hour

    try {
        const deliveredOrders = await prisma.order.findMany({
            where: {
                status: OrderStatus.DELIVERED,
                notified: false
            },
        });

        deliveredOrders.forEach(order => {
            console.log(`Order ID: ${order.id}, Name: ${order.name}, Notified: ${order.notified}, UserID: ${order.userId}`);
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

        for (const userId of uniqueIds) {
            const orderPlacer = await prisma.user.findUnique({
              where: {
                id: userId,
              },
            });
          
            if (!orderPlacer || !orderPlacer.phone || !orderPlacer.carrier) {
              console.warn(`User with ID ${userId} has missing phone or carrier information.`);
              continue; 
            }
            
            console.log(`Sending notification to User: ${orderPlacer.name} (ID: ${userId}), Phone: ${orderPlacer.phone}, Carrier: ${orderPlacer.carrier}`);

            const carrierEmailDomain = carrier_domain[orderPlacer.carrier as keyof typeof carrier_domain];
            if (!carrierEmailDomain) {
              console.warn(`Carrier "${orderPlacer.carrier}" is not supported.`);
              continue;
            }
          
            const cleanedPhone = orderPlacer.phone.replace(/\D/g, ''); 
            const recipientEmail = `${cleanedPhone}${carrierEmailDomain}`;
          
            const mailOptions = {
              from: process.env.EMAIL_USER, 
              to: recipientEmail, 
              subject: `You have a delivery!`,
              text: `Your order is ready to be picked up. View details: https://relay.tamuformulaelectric.com/backlog. - FSAE EV`,
            };
          
            try {
              await transporter.sendMail(mailOptions);
              console.log(`Notification sent to User ID: ${userId}, Email-to-SMS: ${recipientEmail}`);
              await prisma.order.updateMany({
                where: {
                  userId: userId,
                  status: OrderStatus.DELIVERED,
                  notified: false,
                },
                data: { notified: true },
              });
              console.log(`Orders for User ID: ${userId} have been marked as notified.`);
            } catch (error) {
              console.error('Error sending email:', error);
            }
          }
          
    } catch (error) {
        console.error(error);
    }

    return new Response(JSON.stringify({ message: "Email sent successfully" }), { status: 200 });
}