-- Wipe and reseed
DELETE FROM business_template_steps;
DELETE FROM business_templates;
DELETE FROM business_categories;

ALTER TABLE business_categories ADD COLUMN IF NOT EXISTS emoji text;
ALTER TABLE business_templates ADD COLUMN IF NOT EXISTS overview_content text;
ALTER TABLE business_templates ADD COLUMN IF NOT EXISTS overview_video_url text;
ALTER TABLE business_templates ADD COLUMN IF NOT EXISTS overview_web_url text;
ALTER TABLE business_templates ADD COLUMN IF NOT EXISTS overview_pdf_url text;

INSERT INTO business_categories (id,name,slug,icon,emoji,sort_order) VALUES
 ('5121c6db-3d99-48bf-bb0f-508b6c677f28','Agriculture & Farming','agriculture-farming','🌾','🌾',0),
 ('0540cdc9-902c-42fc-b2d5-852125119ef5','Food Processing & Hospitality','food-hospitality','🍽️','🍽️',1),
 ('f1b62c5a-fa46-4ba3-b6a0-18e218128f81','Retail & Trading','retail-trading','🛒','🛒',2),
 ('97127a4a-26fa-4249-9325-5996171d5e79','Services & Personal Care','services-personal-care','💆','💆',3),
 ('45bd9ab2-d65a-4dc6-a4ea-5f4dd33d8832','Manufacturing & Crafts','manufacturing-crafts','🔨','🔨',4),
 ('cbed4b42-714f-4db2-b3b6-dfd916027dcd','Digital & Creative','digital-creative','💻','💻',5),
 ('95f42a7a-4510-4c01-be8e-ab8db84954c5','Transport & Logistics','transport-logistics','🚚','🚚',6),
 ('4ae782aa-3e1e-4e01-b9b6-927de19f7b1b','Construction & Real Estate','construction-real-estate','🏗️','🏗️',7),
 ('cd594898-1ac8-4f1a-b82c-770a175f1b0f','Green & Environmental','green-environmental','🌱','🌱',8),
 ('bb80b169-9dba-4b9a-85dd-97ed20042c21','Health & Social Services','health-social-services','🏥','🏥',9);
