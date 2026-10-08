function execute() {
    var B = "https://metruyenchuvn.org";
    return Response.success([
        { title: "Trang Chủ", input: B, script: "homecontent.js" },
        { title: "Truyện Hot", input: B + "/danh-sach/truyen-hot", script: "homecontent.js" },
        { title: "Truyện Full", input: B + "/danh-sach/truyen-full", script: "homecontent.js" },
        { title: "Ngôn Tình Hay", input: B + "/danh-sach/truyen-ngon-tinh-hay", script: "homecontent.js" },
        { title: "Tiên Hiệp Hay", input: B + "/danh-sach/truyen-tien-hiep-hay", script: "homecontent.js" },
        { title: "Kiếm Hiệp Hay", input: B + "/danh-sach/truyen-kiem-hiep-hay", script: "homecontent.js" },
        { title: "Đam Mỹ Hay", input: B + "/danh-sach/truyen-dam-my-hay", script: "homecontent.js" }
    ]);
}
