// Map.groupByはNode 21+/workerd限定で、ローカルdev(Node 20)だと落ちるため自前実装を使う
export function groupByMap<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const groupKey = key(item);
    const group = map.get(groupKey);
    if (group) group.push(item);
    else map.set(groupKey, [item]);
  }
  return map;
}
