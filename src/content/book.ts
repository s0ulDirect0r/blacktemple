/**
 * Excerpt from the novel "An Infinite Heart": the full prologue, verbatim.
 *
 * Shown on the standalone /portfolio page and, collapsed behind a button, in
 * the /book zone. One string per paragraph, in reading order.
 */

export interface BookExcerpt {
  /** Short label for the excerpt, e.g. "Prologue". */
  title: string;
  paragraphs: string[];
}

export const bookExcerpt: BookExcerpt = {
  title: 'Prologue',
  paragraphs: [
    'Close your eyes and open your imagination. Before you lies a huge field. Covered in beautiful long green blades of grass. Flowers from across the world bloom without discrimination here. Lillies, roses, tulips, morning glories, and a whole bunch of others you can’t identify because you’re probably not a fucking botanist. Shout outs to the botanists in the house, you’re great and we love you.',
    'As you look around, you see it. And you wonder how you didn’t see it immediately because it stands out.',
    'It’s a gigantic tree. Reaching deep into the sky, its canopy, its crown resting in the world’s exosphere. You understand that at that point, you’re basically just in space. You wonder what it’s like to exist so far above common reality.',
    'Its trunk is a deep brown and yet...not. If you look too closely, the colors...stop making sense. Is it brown or is that just what you expect from trees? Is it actually green? Blue? Orange? What kind of fucking tree trunk is orange? Why does it seem like there are stars inside of the tree? You suspect because there are.',
    'The branches sprawl out across the atmosphere, prodding and poking at it, pushing into spacetime. They glow, and move, slowly, but still they move, as if they were the arms of a colossal giant. Or, you know, the arms of a really big tree. You’re not quite sure how you could possibly perceive and understand this, but you know those branches don’t just end where they appear to.',
    'The Tree is almost another planet unto itself. It even has its own gravity, objects, artifacts, birds, creatures you can’t readily identify with scales, horns, and other weird appendages. It’s like the planet’s dick or something, thrusting into the Ether. Hot.',
    'All you can do is just stare at it. Trying to take in the whole of it with the limited perceptual capacities of the human eye, but the Tree refuses to cooperate, twisting and changing colors and stretching in and out across dimensions, expanding and contracting as if it were breathing, as if it were a Universe being born, contracting on itself, and exploding outward again.',
    'As you stare...you slowly cease to see the difference between it and you.  You cease to see a difference altogether.  You breathe. The Tree breathes. The Tree’s branches stretch out and wave; your arms stretch out and wave. Your trunk, your skin, your hands glow with the radiance of a million galaxies. Your essence stretches across the Universe and merges with All That Is.',
    'You are filled with an overwhelming sense of Love and Unity; your eyes flood with tears and you drop to your knees, relieved of your overwhelming alienation. You are home. You are where you’ve always been.',
    '“I AM THAT I AM”',
    'Did you say that? Does it matter? Who are “you”?',
    'There is just “us” now.',
    'We wonder and are amazed by our multi-dimensionality.',
    'We revel in our expansions. We are fascinated with our contractions.',
    'We are all there is.',
    'And then we wake up.',
  ],
};
