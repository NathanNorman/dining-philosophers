#!/usr/bin/env python3
"""
Process philosopher portraits into rounded 50x50px images for the visualization.
"""

from PIL import Image, ImageDraw
import os


def create_rounded_portrait(input_path, output_path, size=(50, 50)):
    """Create a rounded portrait from an image."""

    # Open and convert to RGBA
    img = Image.open(input_path).convert("RGBA")

    # Create a square crop of the image (center crop)
    width, height = img.size
    min_dim = min(width, height)

    # Calculate crop box for center square
    left = (width - min_dim) // 2
    top = (height - min_dim) // 2
    right = left + min_dim
    bottom = top + min_dim

    # Crop to square
    img = img.crop((left, top, right, bottom))

    # Resize to target size
    img = img.resize(size, Image.Resampling.LANCZOS)

    # Create a circular mask
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0) + size, fill=255)

    # Apply the circular mask
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    output.paste(img, (0, 0))
    output.putalpha(mask)

    # Save the result
    output.save(output_path, "PNG")
    print(f"Created {output_path}")


def main():
    philosophers = [
        ("socrates.jpg", "socrates-rounded.png"),
        ("plato.jpg", "plato-rounded.png"),
        ("aristotle.jpg", "aristotle-rounded.png"),
        ("nietzsche.jpg", "nietzsche-rounded.png"),
        ("descartes.jpg", "descartes-rounded.png"),
    ]

    for input_file, output_file in philosophers:
        if os.path.exists(input_file):
            create_rounded_portrait(input_file, output_file)
        else:
            print(f"Warning: {input_file} not found")

    print("\nAll portraits processed!")
    print("Move the -rounded.png files to the parent directory to use them.")


if __name__ == "__main__":
    main()
