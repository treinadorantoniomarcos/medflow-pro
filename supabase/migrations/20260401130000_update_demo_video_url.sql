update public.platform_settings
set video_url = 'https://drive.google.com/file/d/1DCiWfe7JuWROGNnVShKxpNGWBNbzgt5Z/view?usp=sharing',
    updated_at = now()
where id = 1
  and (video_url is null or video_url = 'https://drive.google.com/drive/u/1/folders/1U3KwW_Glpyx377jQksu-a2knubH78Zik');
