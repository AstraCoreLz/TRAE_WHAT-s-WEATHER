#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将emoji转换为PNG图标文件
"""

import os
from PIL import Image, ImageDraw, ImageFont
import requests
from io import BytesIO

def create_emoji_icon(emoji, size=512, output_path="static/images/favicon.png"):
    """
    将emoji转换为PNG图标
    
    Args:
        emoji: emoji字符
        size: 图标尺寸
        output_path: 输出路径
    """
    try:
        # 创建一个透明背景的图像
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # 尝试使用系统字体渲染emoji
        font_size = int(size * 0.8)  # 字体大小为图像尺寸的80%
        
        # Windows系统常见的支持emoji的字体
        font_paths = [
            "C:/Windows/Fonts/seguiemj.ttf",  # Segoe UI Emoji
            "C:/Windows/Fonts/NotoColorEmoji.ttf",  # Noto Color Emoji
            "C:/Windows/Fonts/TwitterColorEmoji-SVGinOT.ttf",  # Twitter Color Emoji
        ]
        
        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    font = ImageFont.truetype(font_path, font_size)
                    break
                except:
                    continue
        
        if font is None:
            # 如果没有找到合适的字体，使用默认字体
            try:
                font = ImageFont.load_default()
            except:
                print("无法加载字体，使用基本渲染")
                font = None
        
        # 计算文本位置（居中）
        if font:
            bbox = draw.textbbox((0, 0), emoji, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
        else:
            text_width = size // 2
            text_height = size // 2
        
        x = (size - text_width) // 2
        y = (size - text_height) // 2
        
        # 绘制emoji
        if font:
            draw.text((x, y), emoji, font=font, fill=(0, 0, 0, 255))
        else:
            # 如果没有字体，创建一个简单的图标
            draw.ellipse([size//4, size//4, 3*size//4, 3*size//4], fill=(135, 206, 235, 255))
            draw.text((size//2-10, size//2-10), "🌤", fill=(255, 255, 255, 255))
        
        # 确保输出目录存在
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # 保存图像
        img.save(output_path, "PNG")
        print(f"图标已保存到: {output_path}")
        
        # 创建不同尺寸的图标
        sizes = [16, 32, 48, 64, 128, 256]
        for icon_size in sizes:
            resized_img = img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
            icon_path = output_path.replace('.png', f'_{icon_size}.png')
            resized_img.save(icon_path, "PNG")
            print(f"图标已保存到: {icon_path}")
        
        return True
        
    except Exception as e:
        print(f"创建图标时出错: {e}")
        return False

def main():
    """主函数"""
    emoji = "🌤️"
    
    print(f"正在将 {emoji} 转换为PNG图标...")
    
    # 创建主图标
    success = create_emoji_icon(emoji, 512, "static/images/favicon.png")
    
    if success:
        print("\n图标创建成功！")
        print("已创建以下文件:")
        print("- static/images/favicon.png (512x512)")
        print("- static/images/favicon_16.png (16x16)")
        print("- static/images/favicon_32.png (32x32)")
        print("- static/images/favicon_48.png (48x48)")
        print("- static/images/favicon_64.png (64x64)")
        print("- static/images/favicon_128.png (128x128)")
        print("- static/images/favicon_256.png (256x256)")
    else:
        print("图标创建失败！")

if __name__ == "__main__":
    main()