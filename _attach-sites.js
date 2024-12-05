import { writeFile, readFile, mkdir, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { items } from 'bangumi-data';
// import { fetchData } from './utils/spider';
import { intervalToDuration  } from 'date-fns';
import { mergeAndSaveData } from './merge';


/** @typedef {import('./data').DataItem} DataItem */
/** 从 Bangumi页面提取信息
 * @param {string} id
 * @returns {Promise<DataItem | null>}
 */
const fetchData = async (id) => {
  const folder = id.slice(0, 3).padEnd(3, '0');
  const file = join(__dirname, `data/${folder}/${id}.json`);
  const data = await readFile(file, 'utf-8');
  return JSON.parse(data);
}


/** @typedef {import('bangumi-data/data').Site[]} Sites */
/**
 * @type {Object.<string, Sites>}
 */
const siteIdMap = {};

items.forEach((item) => {
  const site = item.sites.find((site) => site.site === 'bangumi');
  const bgmId = site?.id ?? '';
  siteIdMap[bgmId] = item.sites;
});

const completedIdsStr = await readFile(join(__dirname, 'completed_ids'), { encoding: 'utf8' });
const differenceIds = completedIdsStr.split('\n');


const fetchAndSave = async () => {
  const speed = 50;
  let currentIndex = 0;
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      if (currentIndex >= differenceIds.length) {
        clearInterval(intervalId);
        console.log('全部请求完成！');
        return resolve(undefined);
      }

      try {
        const id = differenceIds[currentIndex++];
        if (!id) return;
        const aniData = await fetchData(id);

        if (aniData === null) {
          console.log(`Failed: ${id}`);
          return;
        }

        const data = {
          ...aniData,
          sites: siteIdMap[id]
        }

        const dirPath = join(__dirname, 'data', id.slice(0, 3).padEnd(3, '0'));
        const filePath = join(dirPath, `${id}.json`);

        await mkdir(dirPath, { recursive: true });
        await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

        const count = differenceIds.length - currentIndex;
        const duration = intervalToDuration({ start: 0, end: speed * count });
        const { hours, minutes, seconds } = duration;
        console.log(`完成：${data.name_cn || data.name}(${data.id}); 剩余：${count}项, 需${hours ?? 0}时${minutes ?? 0}分${seconds ?? 0}秒`);
      } catch (error) {
        reject(error);
      }
    }, speed);
  })
}

(async () => {
  try {
    await fetchAndSave();
    await mergeAndSaveData();
  } catch (error) {
    console.error(error);
  }
})();

