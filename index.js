document.getElementById('calcBtn').addEventListener('click', calculate);

async function calculate() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const urlInput = document.getElementById('url').value.trim();
  const resultDiv = document.getElementById('result');
  
  if (!apiKey) {
    resultDiv.style.color = '#ff6b6b';
    resultDiv.innerText = 'エラー: Steam API Key を入力しろ';
    return;
  }

  if (!urlInput) {
    resultDiv.style.color = '#ff6b6b';
    resultDiv.innerText = 'エラー: SteamのURLまたはIDを入力してくれぃ';
    return;
  }

  resultDiv.style.color = '#a4d007';
  resultDiv.innerText = 'API通信中...';

  //URLからID
  const idMatch = urlInput.match(/profiles\/(\d+)/) || urlInput.match(/id\/([^\/]+)/) || urlInput.match(/^(\d+)$/);
  if (!idMatch) {
    resultDiv.style.color = '#ff6b6b';
    resultDiv.innerText = 'エラー: プロフィールのURL間違ってるってよ';
    return;
  }

  const rawId = idMatch[1];
  const isDigits = /^\d+$/.test(rawId);

  try {
    let steamId64 = rawId;

    if (!isDigits) {
      const resolveUrl = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${apiKey}&vanityurl=${rawId}`;
      const proxyResolveUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(resolveUrl)}`;
      
      const resolveRes = await fetch(proxyResolveUrl);
      const resolveDataRaw = await resolveRes.json();
      const resolveData = typeof resolveDataRaw.contents === 'string' ? JSON.parse(resolveDataRaw.contents) : resolveDataRaw.contents;

      if (resolveData.response && resolveData.response.success === 1) {
        steamId64 = resolveData.response.steamid;
      } else {
        throw new Error('URLからSteamID見つけれんかったAPI Keyを確認again');
      }
    }

    // ウィッシュリストデータ
    const targetSteamUrl = `https://store.steampowered.com/wishlist/profiles/${steamId64}/wishlistdata/?cc=jp`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetSteamUrl)}`;

    const res = await fetch(proxyUrl);
    if (!res.ok) {
      throw new Error(`HTTP通信エラー (ステータス: ${res.status})`);
    }

    const responseData = await res.json();
    const data = typeof responseData.contents === 'string' ? JSON.parse(responseData.contents) : responseData.contents;

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0 || data.success === 2) {
      resultDiv.style.color = '#ff6b6b';
      resultDiv.innerText = '取得失敗: 非公開じゃね？プロフィールで「ゲームの詳細」が【公開】に変更よろ';
      return;
    }

    let totalYen = 0;
    let count = 0;

    for (let key in data) {
      const game = data[key];
      if (game) {
        let price = 0;
        if (game.subs && game.subs.length > 0 && typeof game.subs[0].price_actual === 'number') {
          price = game.subs[0].price_actual;
        } else if (typeof game.price_actual === 'number') {
          price = game.price_actual;
        }

        if (price > 0) {
          totalYen += Math.floor(price / 100);
        }
        count++;
      }
    }

    resultDiv.style.color = '#a4d007';
    resultDiv.innerText = `合計: ${count} 件\n予定浪費額: ¥${totalYen.toLocaleString()}`;

  } catch (e) {
    console.error(e);
    resultDiv.style.color = '#ff6b6b';
    resultDiv.innerText = `エラーが発生しました:\n${e.message}`;
  }
}
