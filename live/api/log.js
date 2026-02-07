import {createClient} from "@supabase/supabase-js";

// 这里的 URL 和 Key 建议去 Vercel 的 Environment Variables 里设置
// 如果图简单，直接填字符串也行（但注意不要泄露给别人）
// 使用 process.env 读取环境变量，代码里不出现具体的 Key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // 获取 IP (处理 Vercel 转发)
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "127.0.0.1";
    const ua = req.headers["user-agent"] || "unknown";
    const source = "live";

    // 1. 获取地理位置和运营商 (ip-api.com)
    let location = "未知";
    let isp = "未知";

    try {
        // 使用你找的淘宝接口
        const tbRes = await fetch(`https://ip.taobao.com/outGetIpInfo?ip=${ip}&accessKey=alibaba-inc`);
        const tbData = await tbRes.json();

        if (tbData.code === 0) {
            const d = tbData.data;
            location = `${d.region}-${d.city}`; // 山东-青岛
            isp = d.isp; // 电信
        }
    } catch (e) {
        console.error("Taobao IP API error");
    }

    console.log("ip:" + ip + " location:" + location + " isp:" + isp + " ua:" + ua + " source:" + source);

    // 2. 存入 Supabase
    // 注意：Supabase 会自动处理 created_at，所以我们不用传时间
    const {error} = await supabase
        .from("visitor_logs")
        .insert([
            {ip, location, isp, ua, source},
        ]);

    if (error) {
        console.log("insert error");
        return res.status(500).json({error: error.message});
    }

    console.log("insert success");
    return res.status(200).json({status: "ok"});
}
