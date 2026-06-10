-- Add curated imagery for each business template category so cards always show a relevant photo.
-- These updates only run when the template still lacks an image_url.

UPDATE business_templates
SET image_url = 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=600&h=400&fit=crop'
WHERE category_id = '5121c6db-3d99-48bf-bb0f-508b6c677f28' AND image_url IS NULL;
-- Agriculture & Farming → field/produce

UPDATE business_templates
SET image_url = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop'
WHERE category_id = '0540cdc9-902c-42fc-b2d5-852125119ef5' AND image_url IS NULL;
-- Food Processing & Hospitality → plated meal

UPDATE business_templates
SET image_url = 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&h=400&fit=crop'
WHERE category_id = 'f1b62c5a-fa46-4ba3-b6a0-18e218128f81' AND image_url IS NULL;
-- Retail & Trading → modern retail scene

UPDATE business_templates
SET image_url = 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600&h=400&fit=crop'
WHERE category_id = '97127a4a-26fa-4249-9325-5996171d5e79' AND image_url IS NULL;
-- Services & Personal Care → grooming/spa

UPDATE business_templates
SET image_url = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&h=400&fit=crop'
WHERE category_id = '45bd9ab2-d65a-4dc6-a4ea-5f4dd33d8832' AND image_url IS NULL;
-- Manufacturing & Crafts → workshop/craft

UPDATE business_templates
SET image_url = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop'
WHERE category_id = 'cbed4b42-714f-4db2-b3b6-dfd916027dcd' AND image_url IS NULL;
-- Digital & Creative → laptop/code

UPDATE business_templates
SET image_url = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=400&fit=crop'
WHERE category_id = '95f42a7a-4510-4c01-be8e-ab8db84954c5' AND image_url IS NULL;
-- Transport & Logistics → truck/delivery

UPDATE business_templates
SET image_url = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&h=400&fit=crop'
WHERE category_id = '4ae782aa-3e1e-4e01-b9b6-927de19f7b1b' AND image_url IS NULL;
-- Construction & Real Estate → construction site

UPDATE business_templates
SET image_url = 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&h=400&fit=crop'
WHERE category_id = 'cd594898-1ac8-4f1a-b82c-770a175f1b0f' AND image_url IS NULL;
-- Green & Environmental → plants/nature

UPDATE business_templates
SET image_url = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop'
WHERE category_id = 'bb80b169-9dba-4b9a-85dd-97ed20042c21' AND image_url IS NULL;
-- Health & Social Services → healthcare
