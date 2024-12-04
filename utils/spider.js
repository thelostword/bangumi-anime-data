import { load } from 'cheerio';
import { format } from 'date-fns';
import { items } from 'bangumi-data';

/** @typedef {import('../data').DataItem} DataItem */

/** 从 Bangumi页面提取信息
 * @param {number} id
 * @returns {Promise<DataItem | null>}
 */
const extractInfoByHtml = async (id) => {
  try {
    const url = `https://bgm.tv/subject/${id}`;

    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, 5000);
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'include',
      // @ts-ignore
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
        Cookie: import.meta.env.BGM_COOKIE
      }
    });

    if (!response.ok) return null;
    const html = await response.text();
    const $ = load(html, null, false);

    const $infoBox = $('#infobox > li');
    const $img = $('#bangumiInfo > div.infobox > div[align=center] > a');
    const $rating = $('#panelInterestWrapper > div.SidePanel');

    const name = $('h1[class=nameSingle] > a').text().trim();
    if (!name || name === '坟场') return null;
    const name_cn = $('h1[class=nameSingle] > a').attr('title') || '';
    const summary = $('#subject_summary').text().trim();
    const date = ($infoBox.has('span.tip:contains("放送开始")').contents().not('span').text() || $infoBox.has('span.tip:contains("发售日")').contents().not('span').text() || $infoBox.has('span.tip:contains("开始")').contents().not('span').text()).trim().replace(/[年月]/g, '-').replace(/[日]/g, '');
    const platform = $('h1[class=nameSingle] > small').text().trim();
    const images = {
      large: $img.attr('href'),
      common: $img.find('img').attr('src'),
    }
    const eps = parseInt($infoBox.has('span.tip:contains("话数")').contents().not('span').text()) || 0;
    const rating_rank = parseInt($rating.find('.global_score').find('small.alarm').text().replace(/#/g, '')) || 0;
    const rating_total = parseInt($('#ChartWarpper > div.chart_desc span[property=v:votes]').text());
    const rating_score = parseFloat($rating.find('.global_score').find('span.number').text());
    const rating_count_arr = $('#ChartWarpper > ul.horizontalChart > li').map((_, element) => {
      const $row = load(element, null, false);
      return {
        score: $row('span.label').text(),
        count: parseInt($row('span.count').text().replace(/[()]/g, ''))
      }
    }).get() || [];
    const rating_count = Object.fromEntries(rating_count_arr.map(({ score, count }) => [score, count]));
    const tags = $('div.subject_tag_section > div.inner > a.l').map((_, element) => {
      const $row = load(element, null, false);
      return {
        name: $row('span').text(),
        count: parseInt($row('small').text())
      }
    }).get()?.filter(item => !!item.name) || [];
    const locked = $('#headerSubject .inner h3').text().trim() === '条目已锁定';

    return {
      id,
      name,
      name_cn,
      summary,
      date: date ? format(date, 'yyyy-MM-dd') : null,
      platform,
      images,
      eps,
      rating: {
        rank: rating_rank,
        total: rating_total,
        score: rating_score,
        count: rating_count
      },
      tags,
      locked
    }
  } catch (err) {
    console.error(err);
    return null;
  }
}

/** 从 Bangumi Api 获取信息
 * @param {number} id
 * @returns {Promise<DataItem | null>}
 */
const extractInfoByApi = async (id) => {
  try {
    const url = `https://api.bgm.tv/v0/subjects/${id}`;

    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, 3000);
    const response = await fetch(url);

    if (!response.ok) return null;
    const data = await response.json();
    const { name, name_cn, summary, date, platform, images, eps, rating, tags, locked } = data;
    if (!name || name === '坟场') return null;

    return {
      id,
      name,
      name_cn,
      summary,
      date,
      platform,
      images: {
        large: images.large.replace(/^https?:/, ''),
        common: images.common.replace(/^https?:/, '')
      },
      eps,
      rating,
      tags,
      locked
    }
  } catch (err) {
    console.error(err);
    return null;
  }
}

/** 获取信息
 * @param {number} id
 * @returns {Promise<DataItem | null>}
 */
export const fetchData = async (id) => {
  let data = await extractInfoByApi(id);
  if (data === null) data = await extractInfoByHtml(id);

  if (data?.date === null) {
    const item = items.find((scope) => !!scope.sites.find((site) => site.site === 'bangumi' && +site.id === id));
    data.date = item?.begin ? format(item.begin, 'yyyy-MM-dd') : null;
  }
  return data;
}
