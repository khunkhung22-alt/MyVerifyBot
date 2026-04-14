require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

const { TOKEN, VERIFIED_ROLE_ID, GUILD_ID, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;

client.once(Events.ClientReady, readyClient => {
    console.log(`✅ บอทออนไลน์แล้วในชื่อ: ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async message => {
    if (message.content === '!setupweb' && message.member.permissions.has('Administrator')) {
        const oauthLink = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('🌐 คลิกเพื่อยืนยันตัวตน')
                .setURL(oauthLink)
                .setStyle(ButtonStyle.Link)
        );

        await message.channel.send({
            content: '**🔒 ระบบยืนยันตัวตนผ่านเว็บไซต์**\nโปรดคลิกปุ่มด้านล่างเพื่อล็อกอินและรับยศเข้าเซิร์ฟเวอร์ครับ',
            components: [row]
        });
        await message.delete().catch(() => {});
    }
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send('❌ ไม่พบรหัสยืนยันตัวตน');

    try {
        const tokenParams = new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI,
        });

        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', tokenParams.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
        });

        const userData = userResponse.data;
        const userAvatar = userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';

        const guild = client.guilds.cache.get(GUILD_ID);
        let serverName = 'Discord Server';
        let serverIcon = 'https://cdn.discordapp.com/embed/avatars/0.png';

        if (guild) {
            serverName = guild.name;
            serverIcon = guild.iconURL() || serverIcon;
            const member = await guild.members.fetch(userData.id).catch(() => null);
            if (member) await member.roles.add(VERIFIED_ROLE_ID);
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="th">
            <head>
                <meta charset="UTF-8">
                <title>ยืนยันตัวตนสำเร็จ</title>
                <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Kanit', sans-serif; background-color: #f0f2f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .card { background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 100%; max-width: 400px; overflow: hidden; text-align: center; }
                    .header { background-color: #5865F2; color: white; padding: 40px 20px; }
                    .check-icon { background: white; color: #5865F2; width: 60px; height: 60px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 30px; margin: 0 auto 15px; }
                    .content { padding: 30px 20px; }
                    .info-row { display: flex; align-items: center; background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #eee; }
                    .avatar { width: 45px; height: 45px; border-radius: 50%; margin-right: 15px; }
                    .text-left { text-align: left; }
                    .label { font-size: 11px; color: #888; text-transform: uppercase; }
                    .value { font-size: 14px; font-weight: 600; color: #333; }
                    .footer { padding-bottom: 25px; color: #aaa; font-size: 13px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="header">
                        <div class="check-icon">✓</div>
                        <h2 style="margin:0">สำเร็จ!</h2>
                        <p style="margin:5px 0 0; opacity:0.8">คุณได้รับการยืนยันตัวตนเรียบร้อยแล้ว</p>
                    </div>
                    <div class="content">
                        <div class="info-row">
                            <img src="${serverIcon}" class="avatar">
                            <div class="text-left">
                                <div class="label">ข้อมูล Server</div>
                                <div class="value">${serverName}</div>
                            </div>
                        </div>
                        <div class="info-row">
                            <img src="${userAvatar}" class="avatar">
                            <div class="text-left">
                                <div class="label">ข้อมูลผู้ใช้งาน</div>
                                <div class="value">${userData.username}</div>
                            </div>
                        </div>
                    </div>
                    <div class="footer">คุณสามารถปิดหน้าต่างนี้ได้ทันที</div>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error(error);
        res.send('<h1>❌ เกิดข้อผิดพลาดในการยืนยันตัวตน</h1>');
    }
});

app.listen(PORT, () => console.log(`🌐 เว็บเซิร์ฟเวอร์ทำงานที่พอร์ต ${PORT}`));
client.login(TOKEN);