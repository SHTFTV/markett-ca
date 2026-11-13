"""Explicit user rule: sponsored items leave the queue; exclusions remain deduped."""
import re

def exclusion_reason(item,site):
    url=item.get('canonicalSourceUrl',item.get('url','')).split('?')[0].rstrip('/')
    for exclusion in site.get('excludedItems',[]):
        if url==exclusion['url'].split('?')[0].rstrip('/'):
            return exclusion['reason']
    if item.get('commercialDisclosure')=='explicit-sponsored-or-paid-promotion':
        return 'User excludes explicitly sponsored or paid-promotional items from the publication queue.'
    if re.search(r'\b(sponsored content|paid partnership|paid promotion|advertorial)\b',item.get('title',''),re.I):
        return 'Explicit sponsored/paid-promotional title; excluded under user rule.'
    return None
