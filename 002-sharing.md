So, _before_ all this kicked off, long ago, in the misty forgotten time some ancient peoples still call "Sunday"... I had this idea that might be more important now, as regards file distribution. Lemme describe the use-case, which is _an actual thing_.

I am working with my baby band on our tiny setlist for our first paid gig ($1 each at a house party! Just so we can say we are working musicians.) The setlist plugin was always broken so I _imagined_ that it would allow me to add/rearrange songs selected from my library, and reorder them, and possibly also put names down for who was playing what part on each song.  And I want to _share my setlist with the band as easily as possible, and make it easy for them to practice their parts in FeedBack_. Then I have another need: We need to make some updates to the list of songs or who's doing what. And the charts _suck_, and it'll be an ongoing project to keep updating the charts to make them better, add drums, etc. and ensure everyone's practicing with the same ones. 

These are very non-technical people, who even seem pretty bad at using Google Drive and Docs, who don't know anything about Assets or GitHub or scary warnings at install, or plugins, and wtf even is CDLC, what are stems, etc, etc. So I need to get them all set up with FeedBack, and I also need to ensure they have the playlist, and that the songs are updating as we fix them, etc. What a mess! 

What's the *ideal *UX for this? Let's name a user persona, Bill the Band Leader. Bill is in charge of the set, he knows who's playing what parts, he knows what we're practicing when we get together, etc.

Creating the setlist
* Bill goes to the setlist plugin, and creates a new setlist. 
* Bill adds a bunch of songs (and maybe some breaks between sets!)
* Bill sees a grid of songs (vertical) to parts (horizontal), and can enter a name in each intersection

Publishing the setlist
* (first time) Bill sends people in the band a link to install FeedBack, which they install, and walk through onboarding
* Bill sends them a link for our setlist, which they click
* FeedBack prompts them to install the Setlist plugin, they click yes
* FeedBack goes to the setlist screen
* The setlist screen prompts them grab the playlist, they click yes
* The setlist screen says "you're missing some songs from the playlist, add them to your library?", they click yes
* They see the setlist. It looks like this:
---
## June 27th, 2026 @ Summer House Party

2:30?-whenever  
Michael’s house: 5432 Arcadian Drive, Fidel Valley

### Set list (draft)

| Song | Vocals | Guitar | Bass | Drums |
| :---- | :---- | :---- | :---- | :---- |
| Zombie | Deme / Rana | Steven / Bret | Ross | Brad |
| Train Kept A Rollin | Rana / Deme | Bret / Steven | Ross | Brad |
| Blitzkrieg Bop | Deme / Anh | Steven \+ Bret | Ross | Brad |
| The Hell Song | Anh / Deme | Steven / Bret | Brad | ??? |
| Sugar We’re Going Down | Deme / Anh | Steven / Bret | Ross | Brad |
| Everyday People | Anh / Deme | Steven \+ Bret \+ Michael | Ross | Brad |
---

* They click on their name in any cell
* The song loads up with their part already selected, the appropriate viz for that part selected, and the part ducked to 10% in the stem mixer

Later, Bill tells them there have been updates to the setlist
* They click the link, and see the setlist changes, and are prompted to add new songs to their library as before
* If the files have changed content hashes (because Bill's been charting!) they are prompted to update the songs 

Later, we have a group rehearsal at School of Rock with Bill
* (first time) Bill sets up a profile for each person and they configure their instrument
* Bill pulls up the setlist
* There's a button to `Play the set`
* A form with the title `Who's who?` appears
* For each name in the grid, Bill selects from a drop-down of the local profiles
* Bill can check a box for "missing today"
* For each song in the setlist, Bill can check a box for "skipping today"
* Bill sees a list of connected displays, and can set which (present) person is assigned to which display
* Bill clicks play, and the first song comes up, with the parts for the people present muted
* Bill clicks Split and each person present sees a pane already selected for them, with their name on it
* Bill clicks Practice, and sets the sections we're going to practice
* When we're done and go to the next song, it's similarly ready to go

Later, some of the members get together to practice at my house
* I do the same exact thing Bill did at rehearsal

On the day of the gig, our drummer Brad gets sick! CRISIS. What are we going to do?!
* I pull out my laptop and plug the audio output into the PA
* I pull up the setlist, click `Play the set`, mark Brad missing
* ...and we go on to play the set with FeedBack providing a drum backing-track

Things that happened behind the scenes:
* The link to install FeedBack automatically picked the self-updating version matching their platform
* During install, FeedBack registered itself to handle `feedback://` URIs
* I sent them a `feedback://setlist?hash=<somehash>` URL
* FeedBack looked up `setlist` in a plugin registry and prompted them to install it
* The setlist plugin took the hash and queried a magnet link for the associated torrent containing the setlist JSON and the song files
* When there are songs in a format FeedBack doesn't recognize, the user is prompted to install a corresponding plugin that can handle it
* The setlist plugin prompted the user to download any missing file, and files where the local did not match
* Where the song included tone information, the corresponding tones got set up, using a URI for the tone-library
* Mapping of names to profiles persists across rehearsals
* When the setlist pulls up individual songs to "play the set", it uses the URL format `feedback://play?[songid]&[stem-settings]&[part->profile map]&[split-map]
* Each part of that URI is handled by the appropriate plugin/capability
* Missing capabilities are either ignored, or prompt for install