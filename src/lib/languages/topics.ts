import type { LanguageTopic } from "./types";

export function sortTopics(a: LanguageTopic, b: LanguageTopic) {
  return a.position - b.position || a.name.localeCompare(b.name);
}

export function topicDescendantIds(topics: LanguageTopic[], topicId: string) {
  const children = new Map<string, string[]>();
  for (const topic of topics) {
    if (!topic.parent_id) continue;
    const siblings = children.get(topic.parent_id) ?? [];
    siblings.push(topic.id);
    children.set(topic.parent_id, siblings);
  }

  const descendants = new Set<string>();
  const pending = [...(children.get(topicId) ?? [])];
  while (pending.length > 0) {
    const id = pending.pop();
    if (!id || descendants.has(id)) continue;
    descendants.add(id);
    pending.push(...(children.get(id) ?? []));
  }
  return descendants;
}

export function topicPathLabels(topics: LanguageTopic[]) {
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const labels = new Map<string, string>();

  function labelFor(topic: LanguageTopic, visiting: Set<string>): string {
    const cached = labels.get(topic.id);
    if (cached) return cached;
    if (!topic.parent_id || visiting.has(topic.id)) return topic.name;

    const parent = byId.get(topic.parent_id);
    if (!parent) return topic.name;
    const nextVisiting = new Set(visiting).add(topic.id);
    return `${labelFor(parent, nextVisiting)} / ${topic.name}`;
  }

  for (const topic of topics) labels.set(topic.id, labelFor(topic, new Set()));
  return labels;
}
