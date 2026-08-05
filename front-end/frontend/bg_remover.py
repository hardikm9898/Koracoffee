import sys
from PIL import Image
from collections import deque

def remove_bg(input_path, output_path, tol=1500):
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    pixels = img.load()
    
    visited = bytearray(width * height)
    queue = deque()
    
    ref_color = pixels[0, 0]
    
    starts = [(0,0), (width-1,0), (0,height-1), (width-1,height-1)]
    for x, y in starts:
        queue.append((x, y))
        visited[y * width + x] = 1
        
    while queue:
        x, y = queue.popleft()
        c = pixels[x, y]
        
        dist = (c[0]-ref_color[0])**2 + (c[1]-ref_color[1])**2 + (c[2]-ref_color[2])**2
        if dist < tol:
            pixels[x, y] = (255, 255, 255, 0)
            
            if x > 0 and visited[y * width + (x - 1)] == 0:
                visited[y * width + (x - 1)] = 1
                queue.append((x - 1, y))
            if x < width - 1 and visited[y * width + (x + 1)] == 0:
                visited[y * width + (x + 1)] = 1
                queue.append((x + 1, y))
            if y > 0 and visited[(y - 1) * width + x] == 0:
                visited[(y - 1) * width + x] = 1
                queue.append((x, y - 1))
            if y < height - 1 and visited[(y + 1) * width + x] == 0:
                visited[(y + 1) * width + x] = 1
                queue.append((x, y + 1))

    img.save(output_path, "PNG")

input_file = sys.argv[1] if len(sys.argv) > 1 else "public/banners/banner-image-4.png"
output_file = sys.argv[2] if len(sys.argv) > 2 else "public/banners/banner-image-4-transparent.png"
remove_bg(input_file, output_file, tol=2200)
print("Done")
