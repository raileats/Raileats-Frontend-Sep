<div className="w-full relative">
  <Slider {...settings}>
    {slides.map((slide) => (
      <div key={slide.id}>
        <div className="relative w-full h-[220px] sm:h-[320px] md:h-[420px] lg:h-[480px] rounded-xl overflow-hidden shadow-lg">
          <Image
            src={slide.image}
            alt={slide.text}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-lg text-sm md:text-lg">
            {slide.text}
          </div>
        </div>
      </div>
    ))}
  </Slider>
</div>
