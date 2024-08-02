import { readdir, readFile, writeFile, mkdir, exists } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { sortBy, prop } from 'ramda';
import { format } from 'date-fns';

/** @typedef {import('./data').DataItem[]} Data */

/**
 * 合并json文件
 * @param {string} dir
 * @returns {Promise<Data>}
 */
const readAndMergeJSONFiles = async (dir) => {
  /**
   * @type {Data}
   */
  const data = [];

  /**
   * @param {string} directory
   */
  const traverseDir = async (directory) => {
    const files = await readdir(directory, { withFileTypes: true });

    for (const file of files) {
      const filePath = join(directory, file.name);
      if (file.isDirectory()) {
        await traverseDir(filePath);
        continue;
      }
      if (file.isFile() && extname(file.name) === '.json') {
        const item = await readFile(filePath, 'utf8');
        const json = JSON.parse(item);
        data.push(json);
      }
    }
  }

  await traverseDir(dir);
  const result = sortBy(prop('date'))(data).reverse();

  return result;
}


export const mergeAndSaveData = async () => {
  try {
    // 合并并保存文件
    const result = await readAndMergeJSONFiles(join(__dirname, 'data'));
    await writeFile(join(__dirname, 'data.json'), JSON.stringify(result), 'utf8');

    // 按年分组保存
    const yearGroup = Object.groupBy(result, (({ date }) => date ? format(date, 'yyyy') : 'unknown'));
    await writeFile(join(__dirname, 'data-by-year.json'), JSON.stringify(yearGroup), 'utf8');

    // 按每年切割保存
    const yearDir = join(__dirname, 'data-by-year');
    await mkdir(yearDir, { recursive: true });
    Object.entries(yearGroup).forEach(async ([key, items]) => {
      const filePath = join(yearDir, `${key}.json`);
      const newContent = JSON.stringify(items);
      // 读取文件对比内容是否相同
      const isExists = await exists(filePath);
      if (isExists) {
        const oldContent = await readFile(filePath, 'utf8');
        if (oldContent === newContent) return;
      }
      await writeFile(filePath, newContent, 'utf8');
    });
  } catch (err) {
    console.error('Error:', err);
  }
}
