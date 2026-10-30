// The online origin is public configuration; credentials never enter the project.
export const DIRECTOR_ONLINE_URL='https://prisma-regia.francesco-gioia.chatgpt.site/';
export const onlineDirector=()=>document.querySelector('meta[name="prisma-director-provider"]')?.content==='online';
